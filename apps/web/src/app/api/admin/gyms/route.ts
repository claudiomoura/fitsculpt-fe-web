import { NextResponse } from "next/server";
import { normalizeGymMutationResult } from "@/lib/gym-contracts";
import { fetchBackend, readJsonBody } from "../../gyms/_proxy";

type BackendContractError = {
  code: string;
  message: string;
  details?: unknown;
};

function buildInvalidBackendPayloadError(payload: unknown): BackendContractError {
  return {
    code: "INVALID_BACKEND_PAYLOAD",
    message: "Expected backend response to be Gym[] for GET /admin/gyms",
    ...(payload === undefined ? {} : { details: payload }),
  };
}

export async function GET() {
  const result = await fetchBackend("/admin/gyms");

  if (result.status < 200 || result.status >= 300) {
    return NextResponse.json(result.payload, { status: result.status });
  }

  if (Array.isArray(result.payload)) {
    return NextResponse.json(result.payload, { status: result.status });
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn("[BFF] Unexpected 2xx payload for /admin/gyms (expected Gym[])", {
      status: result.status,
      payload: result.payload,
    });
  }

  return NextResponse.json(buildInvalidBackendPayloadError(result.payload), { status: 502 });
}

export async function POST(request: Request) {
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const result = await fetchBackend("/admin/gyms", { method: "POST", body: parsedBody.body });

  if (result.status < 200 || result.status >= 300) {
    return NextResponse.json(result.payload, { status: result.status });
  }

  const normalized = normalizeGymMutationResult(result.payload);
  return NextResponse.json({ ...normalized, ...(normalized.gym ?? {}) }, { status: result.status });
}
