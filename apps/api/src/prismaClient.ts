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
  const diagnostics = getDatabaseDiagnostics(normalizedUrl);

  return { source, normalizedUrl, ...diagnostics };
}

export async function createPrismaClientWithRetry(logger?: FastifyLikeLogger) {
  const { normalizedUrl, source, host, database } = resolveDatabaseUrl();

  for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt += 1) {
    const prisma = new PrismaClient({
      datasources: {
        db: { url: normalizedUrl },
      },
    });

    try {
      await prisma.$connect();
      logInfo(logger, { attempt, source, host, database }, "Prisma connected");
      return prisma;
    } catch (error) {
      await prisma.$disconnect().catch(() => undefined);

      if (!isTransientConnectionError(error) || attempt === MAX_CONNECT_ATTEMPTS) {
        logError(logger, { attempt, source, host, database, err: error }, "Prisma failed to connect");
        throw error;
      }

      const delayMs = BASE_BACKOFF_MS * attempt;
      logWarn(
        logger,
        { attempt, maxAttempts: MAX_CONNECT_ATTEMPTS, delayMs, source, host, database },
        "Transient Prisma connection error, retrying",
      );
      await wait(delayMs);
    }
  }

  throw new Error("Prisma connection retries exhausted");
}

export function normalizeDatabaseUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);

    if (!parsed.hostname.includes("render.com")) {
      return rawUrl;
    }

    if (!parsed.searchParams.has("sslmode")) {
      parsed.searchParams.set("sslmode", "require");
    }
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "1");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "0");
    }

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

function getDatabaseDiagnostics(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    const database = parsed.pathname.replace(/^\//, "") || "unknown";
    return {
      host: parsed.host || "unknown",
      database,
    };
  } catch {
    return {
      host: "unknown",
      database: "unknown",
    };
  }
}

function logInfo(logger: FastifyLikeLogger | undefined, obj: Record<string, unknown>, msg: string) {
  if (logger) {
    logger.info(obj, msg);
    return;
  }
  console.info(msg, obj);
}

function logWarn(logger: FastifyLikeLogger | undefined, obj: Record<string, unknown>, msg: string) {
  if (logger) {
    logger.warn(obj, msg);
    return;
  }
  console.warn(msg, obj);
}

function logError(logger: FastifyLikeLogger | undefined, obj: Record<string, unknown>, msg: string) {
  if (logger) {
    logger.error(obj, msg);
    return;
  }
  console.error(msg, obj);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
