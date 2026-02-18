import { fetchBackend } from "../../../../gyms/_proxy";
import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  const { membershipId } = await params;
  const result = await fetchBackend(`/admin/gym-join-requests/${membershipId}/reject`, { method: "POST" });
  return NextResponse.json(result.payload, { status: result.status });
}
