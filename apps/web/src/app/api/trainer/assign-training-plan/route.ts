import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

type AssignPayload = {
  clientId?: unknown;
  sourceTrainingPlanId?: unknown;
};

async function getAuthCookie() {
  const token = (await cookies()).get("fs_token")?.value;
  return token ? `fs_token=${token}` : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const authCookie = await getAuthCookie();
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const payload = (await request.json()) as AssignPayload;
  const clientId = asString(payload.clientId);
  const sourceTrainingPlanId = asString(payload.sourceTrainingPlanId);

  if (!clientId || !sourceTrainingPlanId) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  try {
    const response = await fetch(`${getBackendUrl()}/trainer/members/${clientId}/training-plan-assignment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: authCookie,
      },
      body: JSON.stringify({ trainingPlanId: sourceTrainingPlanId }),
      cache: "no-store",
    });

    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        data = { message: text };
      }
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}
