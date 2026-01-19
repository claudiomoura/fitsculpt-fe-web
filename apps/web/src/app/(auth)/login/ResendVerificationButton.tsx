"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";

export default function ResendVerificationButton() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (response.ok) {
      setStatus("sent");
    } else {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleResend} className="form-stack">
      <label className="form-stack">
        {t("auth.email")}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <button type="submit" className="btn secondary">
        {t("auth.resendVerification")}
      </button>
      {status === "sent" && <span className="muted">{t("auth.resendSent")}</span>}
      {status === "error" && <span className="muted">{t("auth.resendError")}</span>}
    </form>
  );
}
