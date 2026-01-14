"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  // Auth fake por enquanto:
  const ok = email.length > 3 && password.length > 3;
  if (!ok) {
    // fallback simples sem mensagens ainda
    redirect("/login?error=1");
  }

  (await cookies()).set("fs_session", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  const next = String(formData.get("next") || "/app");
  redirect(next);
}

export async function logoutAction() {
  (await cookies()).delete("fs_session");
  redirect("/");
}
