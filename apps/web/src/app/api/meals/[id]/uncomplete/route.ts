import { NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/gyms/_proxy";

/**
 * BFF Route Handler for /api/meals/[id]/uncomplete
 * 
 * Proxies to backend /meals/:id/uncomplete
 * Marks a meal as not completed (undo)
 */

type Params = { id: string };

export async function POST(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  
  return proxyToBackend(`/meals/${id}/uncomplete`, {
    method: "POST",
  });
}
