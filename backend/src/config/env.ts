import 'dotenv/config';
import { z } from 'zod';

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  PUBLIC_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  MONGODB_URI: z.preprocess(emptyToUndefined, z.string().optional()),
  GEMINI_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash'),
  AI_PROVIDER: z.enum(['auto', 'gemini', 'mock']).default('auto'),
  MEDIA_PROVIDER: z.enum(['auto', 'ytdlp', 'instagram', 'mock']).default('auto'),
  YTDLP_PATH: z.preprocess(emptyToUndefined, z.string().default('yt-dlp')),
  YTDLP_METADATA_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(300_000).default(60_000),
  YTDLP_DOWNLOAD_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(900_000).default(240_000),
  YTDLP_MAX_CONCURRENT: z.coerce.number().int().min(1).max(16).default(2),
  META_OEMBED_TOKEN: z.preprocess(emptyToUndefined, z.string().optional()),
  MAX_MEDIA_MB: z.coerce.number().positive().max(500).default(100),
  MOCK_AI_DELAY_MS: z.coerce.number().int().min(0).default(1200),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const publicBaseUrl = env.PUBLIC_BASE_URL ?? `http://localhost:${env.PORT}`;
export const maxMediaBytes = Math.round(env.MAX_MEDIA_MB * 1024 * 1024);
