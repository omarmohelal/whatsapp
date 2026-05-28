import { env } from './config/env';
import { prisma } from './db/prisma';
import { createQueues, scheduleRecurringJobs } from './jobs/queues';
import { logger } from './logger';
import { createApp } from './app';
import { AgentService } from './services/agent';
import { KnowledgeService } from './services/knowledge';
import { MediaCatalogService } from './services/mediaCatalog';
import { GeminiService } from './services/gemini';
import { WhatsAppCloudClient } from './services/whatsapp';

async function main() {
  const queues = createQueues(env);
  await scheduleRecurringJobs(queues);

  const ai = new GeminiService(env, logger);
  const whatsapp = new WhatsAppCloudClient(env);
  const knowledge = new KnowledgeService(prisma, ai);
  const agent = new AgentService({
    prisma,
    whatsapp,
    knowledge,
    mediaCatalog: new MediaCatalogService(prisma, env),
    ai,
    env,
    logger,
    learningQueue: queues.learning
  });

  const app = createApp({
    env,
    logger,
    queues,
    agent,
    admin: {
      prisma,
      knowledge,
      whatsapp
    }
  });

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'TheNexus WhatsApp AI Agent listening');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    server.close();
    await queues.incomingMessages.close();
    await queues.learning.close();
    await queues.ttl.close();
    await queues.connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start app');
  process.exit(1);
});
