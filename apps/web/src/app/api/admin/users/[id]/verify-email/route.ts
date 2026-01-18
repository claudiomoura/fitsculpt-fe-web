import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get("fs_token")?.value;
  const headers: Record<string, string> = {};
  if (token) headers.cookie = `fs_token=${token}`;

  const response = await fetch(`${getBackendUrl()}/admin/users/${id}/verify-email`, {
    method: "POST",
    headers,
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
