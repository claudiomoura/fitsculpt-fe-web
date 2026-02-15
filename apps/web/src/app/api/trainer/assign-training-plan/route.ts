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

  const membershipResponse = await fetch(`${getBackendUrl()}/gyms/membership`, {
    headers: { cookie: authCookie },
    cache: "no-store",
  });

  const membershipData = (await membershipResponse.json()) as { gym?: { id?: string } };
  const gymId = membershipData?.gym?.id;

  if (!membershipResponse.ok || !gymId) {
    return NextResponse.json({ error: "GYM_REQUIRED" }, { status: membershipResponse.status || 400 });
  }

  const response = await fetch(`${getBackendUrl()}/admin/gyms/${gymId}/members/${clientId}/assign-training-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: authCookie,
    },
    body: JSON.stringify({ trainingPlanId: sourceTrainingPlanId }),
    cache: "no-store",
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
