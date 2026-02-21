import { NextResponse } from "next/server";
import { proxyToBackend } from "../../../../../gyms/_proxy";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; dayId: string }> }) {
  const { id, dayId } = await context.params;
  return proxyToBackend(`/trainer/plans/${id}/days/${dayId}`, { method: "DELETE" });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "DELETE, OPTIONS",
    },
  });
}
