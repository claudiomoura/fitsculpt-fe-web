"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";

export default function VerifyEmailClient({ token }: { token: string | null }) {
  const { t } = useLanguage();
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
    return <p className="muted">{t("auth.verifyLoading")}</p>;
  }

  if (status === "success") {
    return <p className="muted">{t("auth.verifySuccess")}</p>;
  }

  return <p className="muted">{t("auth.verifyError")}</p>;
}
