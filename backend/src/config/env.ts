import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  API_PREFIX: z.string().default('/api/v1'),

  DATABASE_URL: z.string(),

  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Encryption
  MASTER_KEY: z.string(),

  // Multi-tenant
  BOOTSTRAP_MODE: z.string().default('false'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  AI_PROVIDER: z.enum(['gemini', 'openai', 'claude']).default('gemini'),
  AI_API_KEY: z.string(),
  AI_MODEL: z.enum(['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-pro', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-5-nano-2025-08-07']).default('gemini-2.0-flash'),
  AI_DEBOUNCE_MS: z.coerce.number().default(10000),

  BULLMQ_QUEUE_NAME: z.string().default('ai-analysis'),
  BULLMQ_CONCURRENCY: z.string().default('5'),

  // WhatsApp
  WHATSAPP_WEBHOOK_PUBLIC_URL: z.string().optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const config = {
  env: parsed.data.NODE_ENV,
  port: parseInt(parsed.data.PORT, 10),
  apiPrefix: parsed.data.API_PREFIX,

  database: {
    url: parsed.data.DATABASE_URL,
  },

  jwt: {
    secret: parsed.data.JWT_SECRET,
    expiresIn: parsed.data.JWT_EXPIRES_IN,
  },

  encryption: {
    masterKey: parsed.data.MASTER_KEY,
  },

  multiTenant: {
    bootstrapMode: parsed.data.BOOTSTRAP_MODE === 'true',
  },

  redis: {
    host: parsed.data.REDIS_HOST,
    port: parseInt(parsed.data.REDIS_PORT, 10),
    password: parsed.data.REDIS_PASSWORD,
  },

  cors: {
    origin: parsed.data.CORS_ORIGIN,
  },

  rateLimit: {
    windowMs: parseInt(parsed.data.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(parsed.data.RATE_LIMIT_MAX_REQUESTS, 10),
  },

  ai: {
    provider: parsed.data.AI_PROVIDER,
    apiKey: parsed.data.AI_API_KEY,
    model: parsed.data.AI_MODEL,
    debounceMs: parseInt(parsed.data.AI_DEBOUNCE_MS, 10),
  },

  bullmq: {
    queueName: parsed.data.BULLMQ_QUEUE_NAME,
    concurrency: parseInt(parsed.data.BULLMQ_CONCURRENCY, 10),
  },

  whatsapp: {
    webhookPublicUrl: parsed.data.WHATSAPP_WEBHOOK_PUBLIC_URL,
  },

  log: {
    level: parsed.data.LOG_LEVEL,
  },
} as const;
