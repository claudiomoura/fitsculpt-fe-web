import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().default("file:./dev.db"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  COOKIE_SECRET: z.string().min(16, "COOKIE_SECRET must be at least 16 chars"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URL: z.string().optional(),
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
    GOOGLE_REDIRECT_URL: process.env.GOOGLE_REDIRECT_URL,
  });
}
