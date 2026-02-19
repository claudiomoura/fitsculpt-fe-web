import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get("fs_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const response = await fetch(`${getBackendUrl()}/billing/plans`, {
      headers: { cookie: `fs_token=${token}` },
      cache: "no-store",
    });

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (response.status === 404) {
      return NextResponse.json(
        {
          error: "BILLING_NOT_AVAILABLE",
          message: "Billing plans endpoint is not available yet.",
          plans: [],
        },
        { status: 501 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (_err) {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}
