export type ServiceErrorReason = "unauthorized" | "notSupported" | "httpError" | "networkError" | "invalidResponse";

export type ServiceSuccess<T> = {
  ok: true;
  data: T;
};

export type ServiceFailure = {
  ok: false;
  reason: ServiceErrorReason;
  status?: number;
  message?: string;
};

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

function normalizeReason(status: number): ServiceErrorReason {
  if (status === 401) return "unauthorized";
  if (status === 404 || status === 405 || status === 501) return "notSupported";
  return "httpError";
}

export async function requestJson<T>(input: string, init?: RequestInit): Promise<ServiceResult<T>> {
  try {
    const response = await fetch(input, {
      cache: "no-store",
      credentials: "include",
      ...init,
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: normalizeReason(response.status),
        status: response.status,
      };
    }

    try {
      const payload = (await response.json()) as T;
      return { ok: true, data: payload };
    } catch {
      return { ok: false, reason: "invalidResponse", status: response.status };
    }
  } catch {
    return { ok: false, reason: "networkError" };
  }
}
