import { NextResponse } from "next/server";
import { proxyToBackend, readJsonBody } from "../../../../../../../gyms/_proxy";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; dayId: string; exerciseId: string }> },
) {
  const { id, dayId, exerciseId } = await context.params;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  return proxyToBackend(`/trainer/plans/${id}/days/${dayId}/exercises/${exerciseId}`, {
    method: "PATCH",
    body: parsed.body,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; dayId: string; exerciseId: string }> },
) {
  const { id, dayId, exerciseId } = await context.params;
  return proxyToBackend(`/trainer/plans/${id}/days/${dayId}/exercises/${exerciseId}`, {
    method: "DELETE",
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "PATCH, DELETE, OPTIONS",
    },
  });
}
