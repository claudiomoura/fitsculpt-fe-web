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
    { error: "FEATURE_NOT_AVAILABLE_IN_BETA" },
    { status: 403 },
  );
}
