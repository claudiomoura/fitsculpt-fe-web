import { NextResponse } from "next/server";
import { proxyToBackend, readJsonBody } from "../../../../gyms/_proxy";

export const dynamic = "force-dynamic";

function applyLegacyHeaders(response: NextResponse, memberId: string) {
  response.headers.set("Deprecation", "true");
  response.headers.set("Sunset", "Wed, 30 Sep 2026 00:00:00 GMT");
  response.headers.set(
    "Link",
    `</api/trainer/clients/${encodeURIComponent(memberId)}/assigned-nutrition-plan>; rel="successor-version"`,
  );
  return response;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const response = await proxyToBackend(`/trainer/clients/${id}/assigned-nutrition-plan`, {
    method: "POST",
    body: parsed.body,
    request,
  });
  return applyLegacyHeaders(response, id);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const response = await proxyToBackend(`/trainer/clients/${id}/assigned-nutrition-plan`, {
    method: "DELETE",
  });
  return applyLegacyHeaders(response, id);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: "POST, DELETE, OPTIONS" } });
}
