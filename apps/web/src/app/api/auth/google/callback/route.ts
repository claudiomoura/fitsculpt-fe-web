import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

function parseAuthCookie(setCookie: string | null) {
  if (!setCookie) return null;
  const cookiePair = setCookie.split(";")[0] ?? "";
  const separatorIndex = cookiePair.indexOf("=");
  if (separatorIndex <= 0) return null;
  const name = cookiePair.slice(0, separatorIndex);
  const value = cookiePair.slice(separatorIndex + 1);
  return { name, value };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = await fetch(`${getBackendUrl()}/auth/google/callback?${url.searchParams.toString()}`);

  if (!response.ok) {
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  }

  const setCookie = response.headers.get("set-cookie");
  const authCookie = parseAuthCookie(setCookie);
  const redirect = NextResponse.redirect(new URL("/app", url.origin));
  if (authCookie) {
    redirect.cookies.set(authCookie.name, authCookie.value, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  return redirect;
}
