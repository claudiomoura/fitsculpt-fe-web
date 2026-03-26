type Logger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export const apiLogger: Logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(`[API] ${message}`, meta ?? "");
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(`[API] ${message}`, meta ?? "");
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(`[API] ${message}`, meta ?? "");
  },
};

export function logApiResponseTime(
  endpoint: string,
  method: string,
  statusCode: number,
  durationMs: number
) {
  const logData = {
    endpoint,
    method,
    statusCode,
    durationMs,
    timestamp: new Date().toISOString(),
  };

  if (durationMs > 1000) {
    apiLogger.warn("Slow API response", logData);
  } else {
    apiLogger.info("API response", logData);
  }

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    import("@sentry/nextjs").then((Sentry) => {
      if (durationMs > 2000) {
        Sentry.captureMessage("Slow API Response", {
          level: "warning",
          extra: logData,
        });
      }
    });
  }
}
