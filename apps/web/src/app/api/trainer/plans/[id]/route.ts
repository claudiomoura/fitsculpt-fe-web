import { NextResponse } from "next/server";
import { proxyToBackend } from "../../../gyms/_proxy";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyToBackend(`/trainer/plans/${id}`);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = await request.json().catch(() => ({}));
  return proxyToBackend(`/trainer/plans/${id}`, { method: "PATCH", body: payload });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyToBackend(`/trainer/plans/${id}`, { method: "DELETE" });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, PATCH, DELETE, OPTIONS",
    },
  });
}

export async function PUT() {
  return NextResponse.json(
    {
      code: "FEATURE_NOT_AVAILABLE_IN_BETA",
      message: "Updating trainer plans with PUT is not supported by backend contract. Use PATCH.",
    },
    { status: 403 },
  );
}
