import pino from 'pino';
import { env } from './config/env';
import { maskSensitiveText } from './services/credentials';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.access_token',
      '*.token',
      '*.WHATSAPP_ACCESS_TOKEN',
      '*.OPENAI_API_KEY'
    ],
    censor: '[REDACTED]'
  },
  serializers: {
    msg(value) {
      return typeof value === 'string' ? maskSensitiveText(value) : value;
    }
  }
});

export type AppLogger = typeof logger;
