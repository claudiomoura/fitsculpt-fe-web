import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const EMPTY_TRACKING_SNAPSHOT = {
  checkins: [],
  foodLog: [],
  workoutLog: [],
};

async function hasAuthCookie() {
  return Boolean((await cookies()).get("fs_token")?.value);
}

export async function GET() {
  if (!(await hasAuthCookie())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  return NextResponse.json(EMPTY_TRACKING_SNAPSHOT, { status: 200 });
}

export async function PUT(request: Request) {
  return writeTracking(request);
}

export async function POST(request: Request) {
  return writeTracking(request);
}

async function writeTracking(request: Request) {
  if (!(await hasAuthCookie())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  if (isTrackingSnapshot(payload)) {
    return NextResponse.json(payload, { status: 200 });
  }

  return NextResponse.json(EMPTY_TRACKING_SNAPSHOT, { status: 200 });
}

function isTrackingSnapshot(value: unknown): value is typeof EMPTY_TRACKING_SNAPSHOT {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Record<string, unknown>;
  return Array.isArray(snapshot.checkins) && Array.isArray(snapshot.foodLog) && Array.isArray(snapshot.workoutLog);
}
