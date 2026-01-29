export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const promoCode = url.searchParams.get("promoCode");

  const backendUrl = getBackendUrl();

  // DEBUG: abre /api/auth/google/start?debug=1 en producción
  if (url.searchParams.get("debug") === "1") {
    return NextResponse.json({
      backendUrl,
      promoCode,
      resolvedStartUrl: `${backendUrl}/auth/google/start`,
    });
  }

  const startUrl = new URL(`${backendUrl}/auth/google/start`);
  if (promoCode) startUrl.searchParams.set("promoCode", promoCode);

  const res = await fetch(startUrl.toString(), { cache: "no-store" });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.redirect(
      new URL(`/login?error=google_start&status=${res.status}&detail=${encodeURIComponent(detail.slice(0, 200))}`, url.origin)
    );
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    return NextResponse.redirect(new URL("/login?error=google_start&detail=no_url", url.origin));
  }

  return NextResponse.redirect(data.url);
}
