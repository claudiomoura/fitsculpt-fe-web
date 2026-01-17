"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getBackendUrl } from "@/lib/backend";

async function storeAuthCookie(response: Response) {
  const setCookieHeader = response.headers.get("set-cookie");
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : setCookieHeader
        ? setCookieHeader.split(/,(?=[^;]+?=)/)
        : [];

  if (setCookies.length === 0) return;

  const cookieStore = await cookies();
  for (const cookie of setCookies) {
    const cookiePair = cookie.split(";")[0] ?? "";
    const separatorIndex = cookiePair.indexOf("=");
    if (separatorIndex <= 0) continue;

    const name = cookiePair.slice(0, separatorIndex);
    const value = cookiePair.slice(separatorIndex + 1);
    cookieStore.set(name, value, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const response = await fetch(`${getBackendUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    const error = data.error === "EMAIL_NOT_VERIFIED" ? "unverified" : data.error === "USER_BLOCKED" ? "blocked" : "1";
    redirect(`/login?error=${error}`);
  }

  await storeAuthCookie(response);

  const next = String(formData.get("next") || "/app");
  redirect(next);
}

export async function registerAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "");
  const promoCode = String(formData.get("promoCode") || "");

  const response = await fetch(`${getBackendUrl()}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      name: name.trim() ? name : undefined,
      promoCode,
    }),
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    const error = data.error === "INVALID_PROMO_CODE" ? "promo" : "1";
    redirect(`/register?error=${error}`);
  }

  redirect("/login?registered=1");
}

export async function logoutAction() {
  const token = (await cookies()).get("fs_token")?.value;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.cookie = `fs_token=${token}`;
  }
  await fetch(`${getBackendUrl()}/auth/logout`, {
    method: "POST",
    headers,
  });
  const cookieStore = await cookies();
  cookieStore.delete("fs_token");
  cookieStore.delete("fs_token.sig");
  redirect("/");
}
