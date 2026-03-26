import { Queue, Worker, type JobsOptions, type Job } from "bullmq";
import type { FastifyBaseLogger } from "fastify";
import { getEnv } from "../../config.js";

const env = getEnv();

export interface AiJobData {
  userId: string;
  type: "training" | "nutrition" | "tip" | "chat";
  input: Record<string, unknown>;
  requestId: string;
}

export interface AiJobResult {
  success: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
}

let aiQueueInstance: Queue<AiJobData, AiJobResult> | null = null;
let aiWorkerInstance: Worker<AiJobData, AiJobResult> | null = null;

export function getAiQueue(logger: FastifyBaseLogger): Queue<AiJobData, AiJobResult> {
  if (aiQueueInstance) return aiQueueInstance;

  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL not configured - queue operations will be no-op");
    aiQueueInstance = new Queue<AiJobData, AiJobResult>("ai-jobs", {
      connection: { host: "localhost", port: 6379 },
      defaultJobOptions: { attempts: 0, removeOnComplete: false },
    });
    return aiQueueInstance;
  }

  aiQueueInstance = new Queue<AiJobData, AiJobResult>("ai-jobs", {
    connection: { url: env.REDIS_URL },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  });

  logger.info({ redisUrl: env.REDIS_URL }, "AI Queue initialized");
  return aiQueueInstance;
}

export function createAiWorker(
  logger: FastifyBaseLogger,
  processor: (job: Job<AiJobData, AiJobResult, string>) => Promise<AiJobResult>,
): Worker<AiJobData, AiJobResult> {
  if (aiWorkerInstance) return aiWorkerInstance;

  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL not configured - worker not started");
    return null as unknown as Worker<AiJobData, AiJobResult>;
  }

  aiWorkerInstance = new Worker<AiJobData, AiJobResult>("ai-jobs", processor, {
    connection: { url: env.REDIS_URL },
    concurrency: env.AI_QUEUE_CONCURRENCY,
  });

  aiWorkerInstance.on("completed", (job) => {
    logger.info({ jobId: job.id, data: job.data }, "AI job completed");
  });

  aiWorkerInstance.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "AI job failed");
  });

  logger.info({ concurrency: env.AI_QUEUE_CONCURRENCY }, "AI Worker initialized");
  return aiWorkerInstance;
}

export async function addAiJob(
  queue: Queue<AiJobData, AiJobResult>,
  data: AiJobData,
  options?: JobsOptions,
): Promise<string | undefined> {
  const job = await queue.add(
    data.type,
    data,
    options ?? { jobId: data.requestId },
  );
  return job.id;
}

export async function closeAiQueue(): Promise<void> {
  if (aiQueueInstance) {
    await aiQueueInstance.close();
    aiQueueInstance = null;
  }
  if (aiWorkerInstance) {
    await aiWorkerInstance.close();
    aiWorkerInstance = null;
  }
}