import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import { defaultProfile } from "@/lib/profile";

const PROFILE_KEYS = new Set(Object.keys(defaultProfile));

async function getAuthCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get("fs_token")?.value;
  const tokenSig = cookieStore.get("fs_token.sig")?.value;
  if (!token) return null;
  return tokenSig ? `fs_token=${token}; fs_token.sig=${tokenSig}` : `fs_token=${token}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMergeRecords(base: Record<string, unknown>, incoming: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };

  Object.entries(incoming).forEach(([key, value]) => {
    const currentValue = merged[key];
    if (isPlainObject(currentValue) && isPlainObject(value)) {
      merged[key] = deepMergeRecords(currentValue, value);
      return;
    }
    merged[key] = value;
  });

  return merged;
}

function pickProfileFields(payload: Record<string, unknown>): Record<string, unknown> {
  const profileFields: Record<string, unknown> = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (PROFILE_KEYS.has(key)) {
      profileFields[key] = value;
    }
  });
  return profileFields;
}

function flattenProfileEnvelope(payload: Record<string, unknown>): Record<string, unknown> {
  const rootProfile = pickProfileFields(payload);
  const nestedProfile = isPlainObject(payload.profile) ? flattenProfileEnvelope(payload.profile) : null;

  if (nestedProfile) {
    return deepMergeRecords(rootProfile, nestedProfile);
  }

  if (Object.keys(rootProfile).length > 0) {
    return rootProfile;
  }

  return payload;
}

function normalizeProfilePayload(payload: unknown): Record<string, unknown> {
  if (!isPlainObject(payload)) {
    return {};
  }

  return flattenProfileEnvelope(payload);
}

async function readUpstreamPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}

async function proxyProfileRequest(request: Request, method: "GET" | "PUT") {
  const authCookie = await getAuthCookie();
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const requestBody = method === "PUT" ? normalizeProfilePayload(await request.json()) : undefined;
    const response = await fetch(`${getBackendUrl()}/profile`, {
      method,
      headers: {
        ...(method === "PUT" ? { "Content-Type": "application/json" } : {}),
        cookie: authCookie,
      },
      ...(method === "GET" ? { cache: "no-store" as const } : {}),
      ...(method === "PUT" ? { body: JSON.stringify(requestBody) } : {}),
    });

    const payload = await readUpstreamPayload(response);

    if (!response.ok) {
      if (isPlainObject(payload)) {
        return NextResponse.json(payload, { status: response.status });
      }
      return NextResponse.json({ error: "UPSTREAM_PROFILE_ERROR" }, { status: response.status });
    }

    return NextResponse.json(normalizeProfilePayload(payload), { status: response.status });
  } catch {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return proxyProfileRequest(request, "GET");
}

export async function PUT(request: Request) {
  return proxyProfileRequest(request, "PUT");
}
