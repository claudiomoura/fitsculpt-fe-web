import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

async function getAuthCookie() {
  const token = (await cookies()).get("fs_token")?.value;
  return token ? `fs_token=${token}` : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getMessage(payload: Record<string, unknown>): string | null {
  if (typeof payload.message === "string" && payload.message.trim().length > 0) return payload.message;
  if (typeof payload.error === "string" && payload.error.trim().length > 0) return payload.error;
  return null;
}

export type ProxyErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export type ProxyOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export type ProxyResult = {
  status: number;
  payload: unknown;
};

export async function readJsonBody(request: Request): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      response: NextResponse.json({ code: "INVALID_PAYLOAD", message: "Expected application/json request body" }, { status: 400 }),
    };
  }

  try {
    return { ok: true, body: (await request.json()) as unknown };
  } catch (_error) {
    return {
      ok: false,
      response: NextResponse.json({ code: "INVALID_PAYLOAD", message: "Malformed JSON body" }, { status: 400 }),
    };
  }
}

function normalizeErrorPayload(status: number, payload: unknown): ProxyErrorPayload {
  if (isRecord(payload)) {
    if (typeof payload.code === "string" && typeof payload.message === "string") {
      return {
        code: payload.code,
        message: payload.message,
        ...(payload.details === undefined ? {} : { details: payload.details }),
      };
    }

    const message = getMessage(payload);
    if (message) {
      return {
        code: typeof payload.error === "string" ? payload.error : `HTTP_${status}`,
        message,
        ...(payload.details === undefined ? {} : { details: payload.details }),
      };
    }
  }

  if (typeof payload === "string" && payload.trim().length > 0) {
    return { code: `HTTP_${status}`, message: payload.trim() };
  }

  return {
    code: status === 401 ? "UNAUTHORIZED" : `HTTP_${status}`,
    message: status === 401 ? "Authentication required" : "Request failed",
  };
}

export async function fetchBackend(path: string, options: ProxyOptions = {}): Promise<ProxyResult> {
  const authCookie = await getAuthCookie();
  if (!authCookie) {
    return {
      status: 401,
      payload: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    };
  }

  try {
    const response = await fetch(`${getBackendUrl()}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        cookie: authCookie,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });

    const text = await response.text();
    let parsed: unknown = null;

    if (text) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch (_err) {
        parsed = { message: text };
      }
    }

    if (response.status >= 200 && response.status < 300) {
      return { status: response.status, payload: parsed };
    }

    return {
      status: response.status,
      payload: normalizeErrorPayload(response.status, parsed),
    };
  } catch (_err) {
    return {
      status: 502,
      payload: {
        code: "BACKEND_UNAVAILABLE",
        message: "Unable to reach backend service",
      },
    };
  }
}

export async function proxyToBackend(path: string, options: ProxyOptions = {}) {
  const result = await fetchBackend(path, options);
  return NextResponse.json(result.payload, { status: result.status });
}
