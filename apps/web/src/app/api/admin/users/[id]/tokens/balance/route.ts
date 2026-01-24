import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get("fs_token")?.value;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.cookie = `fs_token=${token}`;
  const body = await request.text();

  const response = await fetch(`${getBackendUrl()}/admin/users/${id}/tokens/balance`, {
    method: "PATCH",
    headers,
    body,
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
