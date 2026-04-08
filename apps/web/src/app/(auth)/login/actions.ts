"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getBackendUrl } from "@/lib/backend";
import { clearOnboardingDraft } from "@/lib/onboardingDraft";

function getResponseSetCookies(response: Response) {
  const setCookieHeader = response.headers.get("set-cookie");
  return typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : setCookieHeader
      ? setCookieHeader.split(/,(?=[^;]+?=)/)
      : [];
}

function buildCookieHeader(setCookies: string[]) {
  return setCookies.map((cookie) => cookie.split(";")[0] ?? "").filter(Boolean).join("; ");
}

async function storeAuthCookie(response: Response) {
  const setCookies = getResponseSetCookies(response);

  if (setCookies.length === 0) return;

  const cookieStore = await cookies();
  const secure = getBackendUrl().startsWith("https://");
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
      secure,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  }
}

async function syncProfileDraft(profileDraft: string, authCookie: string) {
  if (!profileDraft || !authCookie) return;

  let payload: unknown;
  try {
    payload = JSON.parse(profileDraft) as unknown;
  } catch {
    return;
  }

  const response = await fetch(`${getBackendUrl()}/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      cookie: authCookie,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Profile sync failed: ${response.status}`);
  }

  return response.json();
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  let response!: Response;
  try {
    response = await fetch(`${getBackendUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    redirect("/login?error=backend");
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    const error = data?.error === "EMAIL_NOT_VERIFIED" ? "unverified" : data?.error === "USER_BLOCKED" ? "blocked" : "1";
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
  const next = String(formData.get("next") || "/app");
  const profileDraft = String(formData.get("profileDraft") || "");
  const source = String(formData.get("source") || "");
  const fromOnboardingFlow = source === "onboarding";
  const registerParams = new URLSearchParams({ next });
  if (profileDraft) registerParams.set("onboarding", "1");

  const redirectToRegisterError = (error: string) => {
    if (fromOnboardingFlow) {
      const onboardingParams = new URLSearchParams();
      if (error) onboardingParams.set("error", error);
      if (next) onboardingParams.set("next", next);
      redirect(`/onboarding?${onboardingParams.toString()}`);
    }

    registerParams.set("error", error);
    redirect(`/register?${registerParams.toString()}`);
  };

  let response!: Response;
  try {
    response = await fetch(`${getBackendUrl()}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name: name.trim() ? name : undefined,
        promoCode,
      }),
    });
  } catch {
    redirectToRegisterError("backend");
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    const error = data?.error === "INVALID_PROMO_CODE" ? "promo" : "1";
    redirectToRegisterError(error);
  }

  let loginResponse: Response;
  try {
    loginResponse = await fetch(`${getBackendUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    redirect(`/login?registered=1&next=${encodeURIComponent(next)}`);
  }

  if (!loginResponse.ok) {
    redirect(`/login?registered=1&next=${encodeURIComponent(next)}`);
  }

  await storeAuthCookie(loginResponse);

  const authCookie = buildCookieHeader(getResponseSetCookies(loginResponse));
  const syncResult = await syncProfileDraft(profileDraft, authCookie);
  if (!syncResult) {
    console.warn("[registerAction] Profile draft sync failed, user will need to complete onboarding manually");
  } else {
    console.log("[registerAction] Profile draft synced successfully");
    clearOnboardingDraft();
  }

  redirect(next);
}

export async function logoutAction() {
  const token = (await cookies()).get("fs_token")?.value;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.cookie = `fs_token=${token}`;
  }
  try {
    await fetch(`${getBackendUrl()}/auth/logout`, {
      method: "POST",
      headers,
    });
  } catch {
    // Ignore backend availability errors on logout and clear local cookies regardless.
  }
  const cookieStore = await cookies();
  cookieStore.delete("fs_token");
  cookieStore.delete("fs_token.sig");
  redirect("/");
}
