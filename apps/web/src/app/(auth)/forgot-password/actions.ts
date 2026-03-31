"use server";

import { redirect } from "next/navigation";
import { getBackendUrl } from "@/lib/backend";

export async function forgotPasswordAction(formData: FormData) {
  const email = String(formData.get("email") || "");

  if (!email) {
    redirect("/forgot-password?error=1");
  }

  try {
    const response = await fetch(`${getBackendUrl()}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (response.status === 429) {
      redirect("/forgot-password?error=rate_limited");
    }

    if (!response.ok) {
      redirect("/forgot-password?error=1");
    }
  } catch {
    redirect("/forgot-password?error=1");
  }

  // Always redirect to success to prevent email enumeration
  redirect("/forgot-password?success=1");
}
