import { NextResponse } from "next/server";
import { fetchBackend } from "../../gyms/_proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await fetchBackend("/members/me/assigned-nutrition-plan");

  if (result.status === 404) {
    return NextResponse.json({ assignedPlan: null });
  }

  return NextResponse.json(result.payload, { status: result.status });
}
