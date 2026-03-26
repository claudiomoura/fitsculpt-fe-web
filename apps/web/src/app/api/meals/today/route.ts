import { NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/gyms/_proxy";

/**
 * BFF Route Handler for /api/meals/today
 * 
 * Proxies to backend /meals/today
 * Returns today's meal summary (total calories, protein, carbs, fats)
 */

export async function GET(request: Request) {
  return proxyToBackend("/meals/today", { request });
}
