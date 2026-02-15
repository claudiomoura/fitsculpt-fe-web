import { Prisma, PrismaClient } from "@prisma/client";

const MAX_CONNECT_ATTEMPTS = 4;
const BASE_BACKOFF_MS = 300;

type FastifyLikeLogger = {
  info: (obj: Record<string, unknown>, msg: string) => void;
  warn: (obj: Record<string, unknown>, msg: string) => void;
  error: (obj: Record<string, unknown>, msg: string) => void;
};

export function resolveDatabaseUrl() {
  const source = process.env.DIRECT_URL ? "DIRECT_URL" : "DATABASE_URL";
  const rawUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

  if (!rawUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const normalizedUrl = normalizeDatabaseUrl(rawUrl);
  const host = safeHostFromUrl(rawUrl);

  return { source, normalizedUrl, host };
}

export async function createPrismaClientWithRetry(logger?: FastifyLikeLogger) {
  const { normalizedUrl, source, host } = resolveDatabaseUrl();

  for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt += 1) {
    const prisma = new PrismaClient({
      datasources: {
        db: { url: normalizedUrl },
      },
    });

    try {
      await prisma.$connect();
      logger?.info({ attempt, source, host }, "Prisma connected");
      return prisma;
    } catch (error) {
      await prisma.$disconnect().catch(() => undefined);

      if (!isTransientConnectionError(error) || attempt === MAX_CONNECT_ATTEMPTS) {
        logger?.error({ attempt, source, host, err: error }, "Prisma failed to connect");
        throw error;
      }

      const delayMs = BASE_BACKOFF_MS * attempt;
      logger?.warn(
        { attempt, maxAttempts: MAX_CONNECT_ATTEMPTS, delayMs, source, host },
        "Transient Prisma connection error, retrying",
      );
      await wait(delayMs);
    }
  }

  throw new Error("Prisma connection retries exhausted");
}

function normalizeDatabaseUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    const isRenderHost = parsed.hostname.endsWith(".render.com") || parsed.hostname.includes("render.com");

    if (!isRenderHost) {
      return rawUrl;
    }

    parsed.searchParams.set("sslmode", "require");
    parsed.searchParams.set("connection_limit", "1");
    parsed.searchParams.set("pool_timeout", "0");

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function isTransientConnectionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError && error.errorCode === "P1017") {
    return true;
  }

  if (error instanceof Error) {
    return /(P1017|ECONNRESET|ETIMEDOUT|server has closed the connection|server closed the connection)/i.test(error.message);
  }

  return false;
}

function safeHostFromUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).host;
  } catch {
    return "unknown";
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
