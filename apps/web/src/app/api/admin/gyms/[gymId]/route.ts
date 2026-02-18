import { NextResponse } from "next/server";
import { normalizeGymMutationResult } from "@/lib/gym-contracts";
import { fetchBackend } from "../../../gyms/_proxy";

type Params = {
  params: Promise<{ gymId: string }>;
};

export async function DELETE(_request: Request, { params }: Params) {
  const { gymId } = await params;
  const result = await fetchBackend(`/admin/gyms/${gymId}`, { method: "DELETE" });

  if (result.status < 200 || result.status >= 300) {
    return NextResponse.json(result.payload, { status: result.status });
  }

  const normalized = normalizeGymMutationResult(result.payload);
  return NextResponse.json({ ...normalized, gymId: normalized.gymId ?? gymId }, { status: result.status });
}
