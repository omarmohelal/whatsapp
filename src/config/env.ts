import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isTest = process.env.NODE_ENV === 'test';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default('info'),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  DASHBOARD_ORIGIN: z.string().url().default('http://localhost:3001'),
  CDN_BASE_URL: z.string().url().default('https://cdn.example.com/thenexus'),
  DATABASE_URL: z
    .string()
    .url()
    .default(isTest ? 'postgresql://postgres:postgres@localhost:5432/thenexus_test' : ''),
  REDIS_URL: z.string().url().default(isTest ? 'redis://localhost:6379' : 'redis://redis:6379'),
  ADMIN_API_KEY: z.string().min(16).default(isTest ? 'test-admin-api-key-123456' : ''),
  ADMIN_NOTIFICATION_NUMBER: z.string().optional().default(''),
  AUTO_REPLY_ENABLED: z.enum(['true', 'false']).optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1).default(isTest ? 'verify-token' : ''),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1).default(isTest ? 'wa-token' : ''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).default(isTest ? 'phone-id' : ''),
  WHATSAPP_API_VERSION: z.string().default('v21.0'),
  MESSENGER_VERIFY_TOKEN: z.string().optional().default(''),
  MESSENGER_PAGE_ACCESS_TOKEN: z.string().optional().default(''),
  META_APP_SECRET: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(isTest ? 'test-gemini-key' : ''),
  GEMINI_CHAT_MODEL: z.string().default('gemini-2.0-flash'),
  GEMINI_EMBEDDING_MODEL: z.string().default('text-embedding-004'),
  ENCRYPTION_KEY: z.string().min(16).default(isTest ? 'test-encryption-key-that-is-long-enough' : ''),
  SENSITIVE_DATA_TTL_DAYS: z.coerce.number().int().positive().default(7),
  SECURE_FORM_URL: z.string().url().default('https://www.thenexus.ink/')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.flatten().fieldErrors;
  throw new Error(`Invalid environment configuration: ${JSON.stringify(details)}`);
}

export const env = parsed.data;
export type Env = typeof env;
