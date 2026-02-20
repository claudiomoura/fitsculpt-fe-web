import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function notSupported() {
  return NextResponse.json({ error: "NOT_SUPPORTED" }, { status: 501 });
}

export async function GET() {
  return notSupported();
}

export async function POST() {
  return notSupported();
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
    },
  });
}
