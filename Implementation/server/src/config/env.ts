import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env before anything else
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('30d'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  // Optional — validated at feature-build time, not startup
  CLOUDINARY_URL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('gemini-1.5-flash'),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_EMAIL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables — server cannot start.\n');
  parsed.error.issues.forEach((issue) => {
    console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
  });
  console.error('\n   Copy .env.example → .env and fill in the required values.\n');
  process.exit(1);
}

/** Validated, typed environment variables. Import this instead of process.env everywhere. */
export const env = parsed.data;
export type Env = typeof env;
