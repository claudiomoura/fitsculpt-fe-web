"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getBackendUrl } from "@/lib/backend";

async function storeAuthCookie(response: Response) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return;

  const cookiePair = setCookie.split(";")[0] ?? "";
  const separatorIndex = cookiePair.indexOf("=");
  if (separatorIndex <= 0) return;

  const name = cookiePair.slice(0, separatorIndex);
  const value = cookiePair.slice(separatorIndex + 1);
  (await cookies()).set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
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
    redirect("/login?error=1");
  }

  await storeAuthCookie(response);

  const next = String(formData.get("next") || "/app");
  redirect(next);
}

export async function registerAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "");

  const response = await fetch(`${getBackendUrl()}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      name: name.trim() ? name : undefined,
    }),
  });

  if (!response.ok) {
    redirect("/register?error=1");
  }

  await storeAuthCookie(response);
  redirect("/app");
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
  (await cookies()).delete("fs_token");
  redirect("/");
}
