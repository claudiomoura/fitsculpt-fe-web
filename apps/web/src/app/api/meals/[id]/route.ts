import { NextResponse } from "next/server";
import { proxyToBackend, fetchBackend, readJsonBody } from "@/app/api/gyms/_proxy";

/**
 * BFF Route Handler for /api/meals/[id]
 * 
 * Proxies to backend /meals/:id
 * - PATCH  /meals/:id    -> Update meal log
 * - DELETE /meals/:id    -> Delete meal log
 */

type Params = { id: string };

export async function PATCH(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  const bodyResult = await readJsonBody(request);
  
  if (!bodyResult.ok) {
    return bodyResult.response;
  }
  
  return proxyToBackend(`/meals/${id}`, {
    method: "PATCH",
    body: bodyResult.body,
    request,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  
  const result = await fetchBackend(`/meals/${id}`, { method: "DELETE" });
  
  // Handle 204 No Content specially
  if (result.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  
  return NextResponse.json(result.payload, { status: result.status });
}
