import { Worker } from 'bullmq';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { logger } from '../logger';
import { AgentService } from '../services/agent';
import { KnowledgeService } from '../services/knowledge';
import { LearningService } from '../services/learning';
import { MediaCatalogService } from '../services/mediaCatalog';
import { GeminiService } from '../services/gemini';
import { deleteExpiredSensitiveCredentialData } from '../services/sensitiveDataTtl';
import { WhatsAppCloudClient } from '../services/whatsapp';
import { createQueues, createRedisConnection, scheduleRecurringJobs } from './queues';

async function main() {
  const queues = createQueues(env);
  await scheduleRecurringJobs(queues);

  const ai = new GeminiService(env, logger);
  const knowledge = new KnowledgeService(prisma, ai);
  const agent = new AgentService({
    prisma,
    whatsapp: new WhatsAppCloudClient(env),
    knowledge,
    mediaCatalog: new MediaCatalogService(prisma, env),
    ai,
    env,
    logger,
    learningQueue: queues.learning
  });
  const learning = new LearningService(prisma, ai);

  const incomingWorker = new Worker(
    'incoming-whatsapp-messages',
    async (job) => {
      logger.info({ jobId: job.id, messageId: job.data.messageId }, 'Worker picked WhatsApp job');
      await agent.handleIncomingMessage(job.data);
    },
    {
      connection: createRedisConnection(env) as any,
      concurrency: 5
    }
  );

  const learningWorker = new Worker(
    'conversation-learning',
    async (job) => {
      if (job.name === 'unanswered_question' && job.data.question) {
        await learning.recordUnansweredQuestion({
          conversationId: job.data.conversationId,
          question: job.data.question
        });
      }

      if (job.name === 'admin_reply' && job.data.adminMessageId) {
        await learning.generateFaqSuggestionFromAdminReply({
          conversationId: job.data.conversationId,
          adminMessageId: job.data.adminMessageId
        });
      }
    },
    {
      connection: createRedisConnection(env) as any,
      concurrency: 2
    }
  );

  const ttlWorker = new Worker(
    'sensitive-data-ttl',
    async () => {
      const count = await deleteExpiredSensitiveCredentialData(prisma);
      logger.info({ count }, 'Deleted expired sensitive credential data');
    },
    {
      connection: createRedisConnection(env) as any,
      concurrency: 1
    }
  );

  for (const worker of [incomingWorker, learningWorker, ttlWorker]) {
    worker.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, jobName: job?.name, err: error }, 'Worker job failed');
    });
  }

  logger.info('Workers started');
}

void main().catch((error) => {
  logger.fatal({ err: error }, 'Worker failed to start');
  process.exit(1);
});
