import { NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/gyms/_proxy";

/**
 * BFF Route Handler for /api/meals/date/[date]
 * 
 * Proxies to backend /meals/date/:date
 * Returns meal logs for a specific date
 */

type Params = { date: string };

export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { date } = await params;
  
  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "INVALID_DATE_FORMAT", message: "Date must be in YYYY-MM-DD format" },
      { status: 400 }
    );
  }
  
  return proxyToBackend(`/meals/date/${date}`);
}
