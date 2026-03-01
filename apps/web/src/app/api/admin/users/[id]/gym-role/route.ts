import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

const UPSTREAM_ERROR = "UPSTREAM_ERROR";

type ErrorPayload = { error: string };

function buildHeaders(contentType?: string): Promise<Record<string, string>> {
  return cookies().then((store) => {
    const token = store.get("fs_token")?.value;
    const headers: Record<string, string> = {};
    if (contentType) headers["Content-Type"] = contentType;
    if (token) headers.cookie = `fs_token=${token}`;
    return headers;
  });
}

async function parsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text } satisfies ErrorPayload;
  }
}

function normalizeErrorPayload(payload: unknown, fallback: string): ErrorPayload {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return { error: payload.error };
  }

  return { error: fallback };
}

function buildResponse(status: number, payload: unknown): NextResponse {
  if (status >= 400 && status < 500) {
    return NextResponse.json(normalizeErrorPayload(payload, "REQUEST_FAILED"), { status });
  }

  if (status >= 500) {
    return NextResponse.json(normalizeErrorPayload(payload, UPSTREAM_ERROR), { status: 502 });
  }

  return NextResponse.json(payload, { status });
}

type GymShape = { id?: string | null; name?: string | null };

function normalizeGymsPayload(payload: unknown): { gyms: GymShape[] } {
  if (!Array.isArray(payload)) return { gyms: [] };

  const gyms = payload.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];

    const id = "id" in entry && (typeof entry.id === "string" || entry.id === null) ? entry.id : undefined;
    const name = "name" in entry && (typeof entry.name === "string" || entry.name === null) ? entry.name : undefined;

    return [{ id, name }];
  });

  return { gyms };
}

export async function GET() {
  try {
    const response = await fetch(`${getBackendUrl()}/admin/gyms`, {
      method: "GET",
      headers: await buildHeaders(),
      cache: "no-store",
    });

    const payload = await parsePayload(response);
    if (response.status >= 200 && response.status < 300) {
      return NextResponse.json(normalizeGymsPayload(payload), { status: response.status });
    }

    return buildResponse(response.status, payload);
  } catch {
    return NextResponse.json({ error: UPSTREAM_ERROR }, { status: 502 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();

  try {
    const response = await fetch(`${getBackendUrl()}/admin/users/${id}/assign-gym-role`, {
      method: "POST",
      headers: await buildHeaders("application/json"),
      body,
      cache: "no-store",
    });

    return buildResponse(response.status, await parsePayload(response));
  } catch {
    return NextResponse.json({ error: UPSTREAM_ERROR }, { status: 502 });
  }
}
