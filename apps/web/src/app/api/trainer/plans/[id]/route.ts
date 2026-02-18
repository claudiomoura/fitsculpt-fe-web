import { NextResponse } from "next/server";
import { proxyToBackend } from "../../../gyms/_proxy";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyToBackend(`/training-plans/${id}`);
}

export async function PUT() {
  return NextResponse.json(
    {
      code: "NOT_SUPPORTED",
      message: "Updating trainer plans is not supported by backend yet.",
    },
    { status: 405 },
  );
}
