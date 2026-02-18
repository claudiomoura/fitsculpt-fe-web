import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

async function getAuthCookie() {
  const token = (await cookies()).get("fs_token")?.value;
  return token ? `fs_token=${token}` : null;
}

export type ProxyOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export type ProxyResult = {
  status: number;
  payload: unknown;
};

export async function fetchBackend(path: string, options: ProxyOptions = {}): Promise<ProxyResult> {
  const authCookie = await getAuthCookie();
  if (!authCookie) {
    return { status: 401, payload: { error: "UNAUTHORIZED" } };
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

    return { status: response.status, payload: parsed };
  } catch (_err) {
    return { status: 502, payload: { error: "BACKEND_UNAVAILABLE" } };
  }
}

export async function proxyToBackend(path: string, options: ProxyOptions = {}) {
  const result = await fetchBackend(path, options);
  return NextResponse.json(result.payload, { status: result.status });
}
