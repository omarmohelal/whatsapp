import compression from 'compression';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { ZodError } from 'zod';
import type { Env } from './config/env';
import { env as defaultEnv } from './config/env';
import type { AppQueues } from './jobs/queues';
import { logger as defaultLogger, type AppLogger } from './logger';
import { adminAuth } from './middleware/adminAuth';
import { createAdminRouter } from './routes/admin';
import { createWhatsAppWebhookRouter } from './routes/whatsappWebhook';
import type { AgentService } from './services/agent';
import type { KnowledgeService } from './services/knowledge';
import type { WhatsAppClient } from './services/whatsapp';
import { AppError } from './utils/errors';

export interface AppDeps {
  env?: Env;
  logger?: AppLogger;
  queues?: AppQueues;
  agent?: Pick<AgentService, 'handleIncomingMessage'>;
  admin?: {
    prisma: Parameters<typeof createAdminRouter>[0]['prisma'];
    knowledge: KnowledgeService;
    whatsapp: WhatsAppClient;
  };
}

export function createApp(deps: AppDeps = {}) {
  const appEnv = deps.env ?? defaultEnv;
  const appLogger = deps.logger ?? defaultLogger;
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(
    pinoHttp({
      logger: appLogger
    })
  );
  app.use(express.json({ limit: '2mb' }));

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  app.use(
    createWhatsAppWebhookRouter({
      verifyToken: appEnv.WHATSAPP_VERIFY_TOKEN,
      logger: appLogger,
      incomingQueue: deps.queues?.incomingMessages,
      agent: deps.agent
    })
  );

  if (deps.admin) {
    app.use(
      adminAuth(appEnv.ADMIN_API_KEY),
      createAdminRouter({
        ...deps.admin,
        learningQueue: deps.queues?.learning
      })
    );
  }

  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: 'not_found',
        message: 'Route not found'
      }
    });
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'Invalid request body',
          details: error.flatten()
        }
      });
      return;
    }

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      });
      return;
    }

    appLogger.error({ err: error }, 'Unhandled request error');
    res.status(500).json({
      error: {
        code: 'internal_server_error',
        message: 'Internal server error'
      }
    });
  };

  app.use(errorHandler);

  return app;
}
