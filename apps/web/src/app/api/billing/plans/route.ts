import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "not_implemented" },
    {
      status: 501,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
