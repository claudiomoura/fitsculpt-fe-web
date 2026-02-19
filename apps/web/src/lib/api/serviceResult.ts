export type ServiceErrorReason =
  | "unauthorized"
  | "forbidden"
  | "validation"
  | "notSupported"
  | "httpError"
  | "networkError"
  | "invalidResponse";

export type ServiceSuccess<T> = {
  ok: true;
  data: T;
};

export type ServiceFailure = {
  ok: false;
  reason: ServiceErrorReason;
  status?: number;
  message?: string;
  formError?: string;
  fieldErrors?: Record<string, string>;
};

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeReason(status: number): ServiceErrorReason {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 400) return "validation";
  if (status === 404 || status === 405 || status === 501) return "notSupported";
  return "httpError";
}

function normalizePermissionMessage(payload: unknown): string {
  const source = asRecord(payload);
  return (
    asText(source.message) ??
    asText(source.error_description) ??
    asText(source.error) ??
    "You do not have permission to perform this action."
  );
}

function extractFieldErrors(payload: unknown): Record<string, string> {
  const source = asRecord(payload);
  const candidates = [source.fieldErrors, source.errors, source.validationErrors];
  const mapped: Record<string, string> = {};

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const record = asRecord(item);
        const field = asText(record.field) ?? asText(record.path) ?? asText(record.param);
        const message = asText(record.message) ?? asText(record.msg) ?? asText(record.error);
        if (!field || !message || mapped[field]) continue;
        mapped[field] = message;
      }
      continue;
    }

    const record = asRecord(candidate);
    for (const [key, value] of Object.entries(record)) {
      if (mapped[key]) continue;
      const direct = asText(value);
      if (direct) {
        mapped[key] = direct;
        continue;
      }
      if (Array.isArray(value)) {
        const firstText = value.map(asText).find((entry): entry is string => Boolean(entry));
        if (firstText) mapped[key] = firstText;
      }
    }
  }

  return mapped;
}

function extractFormError(payload: unknown): string | undefined {
  const source = asRecord(payload);
  return (
    asText(source.formError) ??
    asText(source.message) ??
    asText(source.error_description) ??
    asText(source.error) ??
    undefined
  );
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch (_err) {
    return { message: text };
  }
}

export async function requestJson<T>(input: string, init?: RequestInit): Promise<ServiceResult<T>> {
  try {
    const response = await fetch(input, {
      cache: "no-store",
      credentials: "include",
      ...init,
    });

    if (!response.ok) {
      const payload = await parseResponsePayload(response);
      const reason = normalizeReason(response.status);
      const fieldErrors = reason === "validation" ? extractFieldErrors(payload) : undefined;
      const formError = reason === "validation" ? extractFormError(payload) : undefined;

      return {
        ok: false,
        reason,
        status: response.status,
        message: reason === "forbidden" ? normalizePermissionMessage(payload) : extractFormError(payload),
        formError,
        fieldErrors: fieldErrors && Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      };
    }

    const payload = (await parseResponsePayload(response)) as T;
    return { ok: true, data: payload };
  } catch (_err) {
    return { ok: false, reason: "networkError", message: "Unable to connect to the server." };
  }
}
