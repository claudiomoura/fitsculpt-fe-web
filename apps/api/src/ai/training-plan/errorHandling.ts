export function resolveTrainingProviderFailureCause(error: unknown): string {
  const typed = error as { code?: string };
  if (typed?.code === "AI_REQUEST_FAILED") {
    return "AI_REQUEST_FAILED";
  }
  if (typed?.code === "AI_AUTH_FAILED") {
    return "AI_REQUEST_FAILED";
  }
  return typed?.code ?? "UNKNOWN";
}

export function resolveTrainingProviderFailureDebug(error: unknown): Record<string, unknown> | undefined {
  const typed = error as { code?: string; debug?: Record<string, unknown> };
  if (typed?.code !== "AI_REQUEST_FAILED" && typed?.code !== "AI_AUTH_FAILED") {
    return undefined;
  }

  const source = typed.debug ?? {};
  const safeDebug: Record<string, unknown> = {
    cause: "AI_REQUEST_FAILED",
  };

  if (typeof source.status === "number") {
    safeDebug.status = source.status;
  }
  if (typeof source.requestId === "string" && source.requestId.length > 0) {
    safeDebug.requestId = source.requestId;
  }
  if (typeof source.providerCode === "string" && source.providerCode.length > 0) {
    safeDebug.providerCode = source.providerCode;
  }
  if (typeof source.cause === "string" && source.cause === "NETWORK_ERROR") {
    safeDebug.providerCause = "NETWORK_ERROR";
  }

  return safeDebug;
}
