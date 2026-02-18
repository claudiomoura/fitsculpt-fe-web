import { NextResponse } from "next/server";
import { normalizeGymListPayload } from "@/lib/gym-contracts";
import { fetchBackend } from "./_proxy";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const query = searchParams.get("q")?.trim();
  const path = query ? `/gyms?q=${encodeURIComponent(query)}` : "/gyms";

  const result = await fetchBackend(path);

  if (result.status < 200 || result.status >= 300) {
    return NextResponse.json(result.payload, { status: result.status });
  }

  return NextResponse.json({ data: normalizeGymListPayload(result.payload) }, { status: result.status });
}
