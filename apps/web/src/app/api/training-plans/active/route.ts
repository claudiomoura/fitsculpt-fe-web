import { NextResponse } from "next/server";
import { proxyToBackend } from "../../gyms/_proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = query ? `/training-plans/active?${query}` : "/training-plans/active";
  return proxyToBackend(path);
}

export async function POST() {
  return NextResponse.json(
    {
      code: "NOT_AVAILABLE",
      message: "Requires backend implementation: set active training plan endpoint is not available.",
    },
    { status: 501 },
  );
}
