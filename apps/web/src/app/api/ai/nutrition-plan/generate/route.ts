import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
import { getBackendAuthCookie } from "@/lib/backendAuthCookie";
import { contractDriftResponse, validateAiNutritionGeneratePayload } from "@/lib/runtimeContracts";
import { aiRequestFailedResponse, mapAiUpstreamError, parseJsonOrNull } from "@/app/api/_utils/aiErrorMapping";

export const dynamic = "force-dynamic";


export async function POST(request: Request) {
  const { header: authCookie } = await getBackendAuthCookie(request);
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED_NO_FS_TOKEN" }, { status: 401 });
  }

  try {
    const body = await request.text();
    const contentType = request.headers.get("content-type");
    const response = await fetch(`${getBackendUrl()}/ai/nutrition-plan/generate`, {
      method: "POST",
      headers: {
        ...(contentType ? { "content-type": contentType } : {}),
        cookie: authCookie,
      },
      body,
      cache: "no-store",
    });
    const responseText = await response.text();
    const data = parseJsonOrNull(responseText);

    if (!response.ok) {
      return mapAiUpstreamError(response.status, data);
    }

    if (data === null) {
      return aiRequestFailedResponse(502);
    }

    const validation = validateAiNutritionGeneratePayload(data);
    if (!validation.ok) {
      return NextResponse.json(contractDriftResponse("/ai/nutrition-plan/generate", validation.reason ?? "UNKNOWN"), { status: 502 });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (_err) {
    return aiRequestFailedResponse(502);
  }
}
