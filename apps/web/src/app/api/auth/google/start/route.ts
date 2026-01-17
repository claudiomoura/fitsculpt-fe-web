import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

export async function GET() {
  const response = await fetch(`${getBackendUrl()}/auth/google/start`, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  }
  const data = (await response.json()) as { url: string };
  return NextResponse.redirect(data.url);
}
