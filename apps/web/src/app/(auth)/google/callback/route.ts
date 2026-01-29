export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=google_callback", url.origin));
  }

  // Este debe apuntar a tu API real (Fastify), NO al frontend.
  const backendUrl = getBackendUrl();

  // Llamamos al backend para intercambiar el code por un token propio.
  const cbUrl = new URL(`${backendUrl}/auth/google/callback`);
  cbUrl.searchParams.set("code", code);
  cbUrl.searchParams.set("state", state);

  const res = await fetch(cbUrl.toString(), { cache: "no-store" });

  if (!res.ok) {
    return NextResponse.redirect(new URL("/login?error=google_exchange_failed", url.origin));
  }

  const data = (await res.json().catch(() => null)) as { token?: string } | null;

  if (!data?.token) {
    return NextResponse.redirect(new URL("/login?error=google_no_token", url.origin));
  }

  // En Vercel siempre será https, así que secure true está bien.
  const response = NextResponse.redirect(new URL("/app", url.origin));
  response.cookies.set("fs_token", data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}