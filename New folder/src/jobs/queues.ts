import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type { Env } from '../config/env';

export interface LearningJobData {
  conversationId: string;
  question?: string;
  adminMessageId?: string;
  messageId?: string;
}

export interface AppQueues {
  incomingMessages: Queue;
  learning: Queue;
  ttl: Queue;
  connection: IORedis;
}

export function createRedisConnection(env: Env): IORedis {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null
  });
}

export function createQueues(env: Env): AppQueues {
  const connection = createRedisConnection(env);

  return {
    incomingMessages: new Queue('incoming-whatsapp-messages', {
      connection: connection as any
    }),
    learning: new Queue('conversation-learning', {
      connection: connection as any
    }),
    ttl: new Queue('sensitive-data-ttl', {
      connection: connection as any
    }),
    connection
  };
}

export async function scheduleRecurringJobs(queues: AppQueues): Promise<void> {
  await queues.ttl.add(
    'delete_expired_sensitive_data',
    {},
    {
      repeat: {
        pattern: '*/15 * * * *'
      },
      removeOnComplete: true,
      removeOnFail: 100
    }
  );
}
