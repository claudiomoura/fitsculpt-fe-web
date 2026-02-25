import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import { contractDriftResponse, validateExerciseDetailPayload } from "@/lib/runtimeContracts";

async function getAuthCookie() {
  const token = (await cookies()).get("fs_token")?.value;
  return token ? `fs_token=${token}` : null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authCookie = await getAuthCookie();
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  const response = await fetch(`${getBackendUrl()}/exercises/${id}`, {
    headers: { cookie: authCookie },
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);
  if (response.ok) {
    const validation = validateExerciseDetailPayload(data);
    if (!validation.ok) {
      return NextResponse.json(contractDriftResponse("/exercises/:id", validation.reason ?? "UNKNOWN"), { status: 502 });
    }
  }

  return NextResponse.json(data, { status: response.status });
}
