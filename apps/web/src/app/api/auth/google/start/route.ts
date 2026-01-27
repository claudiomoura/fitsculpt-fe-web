import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const promoCode = url.searchParams.get("promoCode");

  const backendUrl = getBackendUrl();
  const startUrl = new URL(`${backendUrl}/auth/google/start`);
  if (promoCode) startUrl.searchParams.set("promoCode", promoCode);

  const res = await fetch(startUrl.toString(), { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.redirect(new URL("/login?error=google_start", url.origin));
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    return NextResponse.redirect(new URL("/login?error=google_start", url.origin));
  }

  return NextResponse.redirect(data.url);
}
