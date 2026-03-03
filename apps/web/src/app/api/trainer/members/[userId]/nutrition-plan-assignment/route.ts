import { NextResponse } from "next/server";
import { proxyToBackend, readJsonBody } from "../../../../gyms/_proxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  return proxyToBackend(`/trainer/clients/${userId}/assigned-nutrition-plan`, { method: "POST", body: parsed.body });
}

export async function DELETE(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  return proxyToBackend(`/trainer/clients/${userId}/assigned-nutrition-plan`, { method: "DELETE" });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: "POST, DELETE, OPTIONS" } });
}
