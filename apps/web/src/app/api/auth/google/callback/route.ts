import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/getBackendUrl";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=google_callback", url.origin));
  }

  const backendUrl = getBackendUrl();
  const res = await fetch(`${backendUrl}/auth/google/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, state }),
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.redirect(new URL("/login?error=google_exchange", url.origin));
  }

  const data = (await res.json()) as { token: string };

  const response = NextResponse.redirect(new URL("/app", url.origin));
  response.cookies.set("fs_token", data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
