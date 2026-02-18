import { NextResponse } from "next/server";
import { normalizeGymListPayload, normalizeGymMutationResult } from "@/lib/gym-contracts";
import { fetchBackend, readJsonBody } from "../../gyms/_proxy";

export async function GET() {
  const result = await fetchBackend("/admin/gyms");

  if (result.status < 200 || result.status >= 300) {
    return NextResponse.json(result.payload, { status: result.status });
  }

  return NextResponse.json(normalizeGymListPayload(result.payload), { status: result.status });
}

export async function POST(request: Request) {
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const result = await fetchBackend("/admin/gyms", { method: "POST", body: parsedBody.body });

  if (result.status < 200 || result.status >= 300) {
    return NextResponse.json(result.payload, { status: result.status });
  }

  const normalized = normalizeGymMutationResult(result.payload);
  return NextResponse.json({ ...normalized, ...(normalized.gym ?? {}) }, { status: result.status });
}
