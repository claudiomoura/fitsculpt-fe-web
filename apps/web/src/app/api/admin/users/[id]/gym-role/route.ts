import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

function buildHeaders(contentType?: string): Promise<Record<string, string>> {
  return cookies().then((store) => {
    const token = store.get("fs_token")?.value;
    const headers: Record<string, string> = {};
    if (contentType) headers["Content-Type"] = contentType;
    if (token) headers.cookie = `fs_token=${token}`;
    return headers;
  });
}

async function toPayload(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch (_error) {
    return { message: text };
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(`${getBackendUrl()}/admin/users/${id}/gym-role`, {
    headers: await buildHeaders(),
    cache: "no-store",
  });

  return NextResponse.json(await toPayload(response), { status: response.status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  const response = await fetch(`${getBackendUrl()}/admin/users/${id}/gym-role`, {
    method: "POST",
    headers: await buildHeaders("application/json"),
    body,
    cache: "no-store",
  });

  return NextResponse.json(await toPayload(response), { status: response.status });
}
