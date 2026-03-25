import { NextResponse } from "next/server";
import { proxyToBackend, fetchBackend, readJsonBody } from "@/app/api/gyms/_proxy";

/**
 * BFF Route Handler for /api/meals
 * 
 * Proxies to backend /meals endpoints:
 * - GET  /meals      -> List meal logs
 * - POST /meals      -> Create meal log
 * 
 * Backend has full meal logging API:
 * - GET  /meals
 * - GET  /meals/date/:date
 * - GET  /meals/today
 * - POST /meals
 * - PATCH /meals/:id
 * - POST /meals/:id/complete
 * - POST /meals/:id/uncomplete
 * - DELETE /meals/:id
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  const path = searchParams ? `/meals?${searchParams}` : "/meals";
  
  return proxyToBackend(path, { request });
}

export async function POST(request: Request) {
  const bodyResult = await readJsonBody(request);
  
  if (!bodyResult.ok) {
    return bodyResult.response;
  }
  
  return proxyToBackend("/meals", {
    method: "POST",
    body: bodyResult.body,
    request,
  });
}
