import { NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/gyms/_proxy";

/**
 * BFF Route Handler for /api/meals/[id]/complete
 * 
 * Proxies to backend /meals/:id/complete
 * Marks a meal as completed
 */

type Params = { id: string };

export async function POST(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  
  return proxyToBackend(`/meals/${id}/complete`, {
    method: "POST",
  });
}
