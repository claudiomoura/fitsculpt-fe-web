import { fetchBackend } from "../../gyms/_proxy";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await fetchBackend("/members/me/assigned-nutrition-plan");

  if (result.status === 404) {
    return NextResponse.json({ assignedPlan: null }, { status: 200 });
  }

  return NextResponse.json(result.payload, { status: result.status });
}
