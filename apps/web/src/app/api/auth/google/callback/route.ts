import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=google_callback", url.origin));
  }

  const backendUrl = getBackendUrl();
  const cbUrl = new URL(`${backendUrl}/auth/google/callback`);
  cbUrl.searchParams.set("code", code);
  cbUrl.searchParams.set("state", state);
  cbUrl.searchParams.set("mode", "bff");

  const res = await fetch(cbUrl.toString(), { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.redirect(new URL("/login?error=google_callback", url.origin));
  }

  const data = (await res.json()) as { token?: string };
  if (!data.token) {
    return NextResponse.redirect(new URL("/login?error=google_callback", url.origin));
  }

  const response = NextResponse.redirect(new URL("/app", url.origin));
  response.cookies.set("fs_token", data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });

  return response;
}
