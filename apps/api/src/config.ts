import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  COOKIE_SECRET: z.string().min(16, "COOKIE_SECRET must be at least 16 chars"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  EMAIL_PROVIDER: z.string().default("console"),
  EMAIL_FROM: z.string().default("no-reply@fitsculpt.app"),
  RESEND_API_KEY: z.string().optional(),
  VERIFICATION_TOKEN_TTL_HOURS: z.coerce.number().default(24),
  VERIFICATION_RESEND_COOLDOWN_MINUTES: z.coerce.number().default(10),
  ADMIN_EMAIL_SEED: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  AI_DAILY_LIMIT_FREE: z.coerce.number().default(3),
  AI_DAILY_LIMIT_PRO: z.coerce.number().default(30),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  return envSchema.parse({
    PORT: process.env.PORT,
    HOST: process.env.HOST,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    COOKIE_SECRET: process.env.COOKIE_SECRET,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
    APP_BASE_URL: process.env.APP_BASE_URL,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    EMAIL_FROM: process.env.EMAIL_FROM,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    VERIFICATION_TOKEN_TTL_HOURS: process.env.VERIFICATION_TOKEN_TTL_HOURS,
    VERIFICATION_RESEND_COOLDOWN_MINUTES: process.env.VERIFICATION_RESEND_COOLDOWN_MINUTES,
    ADMIN_EMAIL_SEED: process.env.ADMIN_EMAIL_SEED,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    AI_DAILY_LIMIT_FREE: process.env.AI_DAILY_LIMIT_FREE,
    AI_DAILY_LIMIT_PRO: process.env.AI_DAILY_LIMIT_PRO,
  });
}
