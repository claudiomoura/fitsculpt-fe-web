"use client";

import { useEffect, useState } from "react";
import { copy } from "@/lib/i18n";

export default function VerifyEmailClient({ token }: { token: string | null }) {
  const c = copy.es;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
      setStatus(response.ok ? "success" : "error");
    };

    void verify();
  }, [token]);

  if (status === "loading") {
    return <p className="muted">{c.auth.verifyLoading}</p>;
  }

  if (status === "success") {
    return <p className="muted">{c.auth.verifySuccess}</p>;
  }

  return <p className="muted">{c.auth.verifyError}</p>;
}
