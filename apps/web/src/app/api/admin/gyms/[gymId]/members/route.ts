import { NextResponse } from "next/server";
import { normalizeMembersPayload } from "@/lib/gym-contracts";
import { fetchBackend } from "../../../../gyms/_proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = await params;
  const result = await fetchBackend(`/admin/gyms/${gymId}/members`);

  if (result.status < 200 || result.status >= 300) {
    return NextResponse.json(result.payload, { status: result.status });
  }

  return NextResponse.json({ data: normalizeMembersPayload(result.payload) }, { status: result.status });
}
