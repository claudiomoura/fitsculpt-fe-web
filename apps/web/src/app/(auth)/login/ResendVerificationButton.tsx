"use client";

import { useState } from "react";
import { copy } from "@/lib/i18n";

export default function ResendVerificationButton() {
  const c = copy.es;
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
        {c.auth.email}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <button type="submit" className="btn secondary">
        {c.auth.resendVerification}
      </button>
      {status === "sent" && <span className="muted">{c.auth.resendSent}</span>}
      {status === "error" && <span className="muted">{c.auth.resendError}</span>}
    </form>
  );
}
