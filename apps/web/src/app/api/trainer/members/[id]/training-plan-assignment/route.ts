import { NextResponse } from "next/server";
import { proxyToBackend, readJsonBody } from "../../../../gyms/_proxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  return proxyToBackend(`/trainer/members/${id}/training-plan-assignment`, { method: "POST", body: parsed.body });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyToBackend(`/trainer/members/${id}/training-plan-assignment`, { method: "DELETE" });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "POST, DELETE, OPTIONS",
    },
  });
}
