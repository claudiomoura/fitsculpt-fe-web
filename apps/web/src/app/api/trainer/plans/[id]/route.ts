import { NextResponse } from "next/server";
import { proxyToBackend } from "../../../gyms/_proxy";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyToBackend(`/trainer/plans/${id}`);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = await request.json().catch(() => ({}));
  return proxyToBackend(`/trainer/plans/${id}`, { method: "PATCH", body: payload });
}

export async function PUT() {
  return NextResponse.json(
    {
      code: "NOT_SUPPORTED",
      message: "Updating trainer plans with PUT is not supported by backend contract. Use PATCH.",
    },
    { status: 405 },
  );
}
