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
import { maskCustomerIdentifiers } from '../services/credentials';
import { createQueues, createRedisConnection, scheduleRecurringJobs } from './queues';

const WHATSAPP_JOB_TIMEOUT_MS = 60_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`WhatsApp job timed out after ${ms}ms`)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

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
      const text = (job.data.text ?? job.data.mediaCaption ?? '').trim();
      logger.info(
        {
          jobId: job.id,
          messageId: job.data.messageId,
          from: maskCustomerIdentifiers(job.data.waId),
          text: maskCustomerIdentifiers(text)
        },
        'Worker picked WhatsApp job'
      );

      try {
        await withTimeout(agent.handleIncomingMessage(job.data), WHATSAPP_JOB_TIMEOUT_MS);
        logger.info({ jobId: job.id, messageId: job.data.messageId }, 'Job completed successfully');
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        logger.error(
          {
            jobId: job.id,
            messageId: job.data.messageId,
            err: error,
            reason
          },
          `Job failed with reason: ${reason}`
        );
        throw error;
      }
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
