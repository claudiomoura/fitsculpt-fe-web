"use server";

import { redirect } from "next/navigation";
import { getBackendUrl } from "@/lib/backend";

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!token || !password || password !== confirmPassword) {
    redirect("/reset-password?error=1");
  }

  if (password.length < 8) {
    redirect("/reset-password?error=1");
  }

  let redirectTarget = "/reset-password?success=1";

  try {
    const response = await fetch(`${getBackendUrl()}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (response.status === 400) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (data?.error === "TOKEN_EXPIRED" || data?.error === "INVALID_TOKEN") {
        redirectTarget = "/reset-password?error=expired";
      }
    }

    if (!response.ok && redirectTarget === "/reset-password?success=1") {
      redirectTarget = "/reset-password?error=1";
    }
  } catch {
    redirectTarget = "/reset-password?error=1";
  }

  redirect(redirectTarget);
}
