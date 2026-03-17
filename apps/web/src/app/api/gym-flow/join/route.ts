import { NextResponse } from "next/server";
import { normalizeGymMutationResult } from "@/lib/gym-contracts";
import { fetchBackend } from "../../gyms/_proxy";
import { parseBodyAsRecord, requireJsonBody } from "../_shared";

export async function POST(request: Request) {
  const parsed = await requireJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const body = parseBodyAsRecord(parsed.body);

  let result = await fetchBackend("/gym/join-request", { method: "POST", body });

  if (result.status === 404 || result.status === 405) {
    result = await fetchBackend("/gyms/join", { method: "POST", body });
  }

  if (result.status >= 200 && result.status < 300) {
    return NextResponse.json({ data: normalizeGymMutationResult(result.payload) }, { status: result.status });
  }

  return NextResponse.json(result.payload, { status: result.status });
}
