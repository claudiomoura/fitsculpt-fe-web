"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { getUserCapabilities } from "@/lib/userCapabilities";

type AuthUser = Record<string, unknown>;

type LoadState = "loading" | "ready" | "error";

export default function TrainerHomeClient() {
  const { t } = useLanguage();
  const [state, setState] = useState<LoadState>("loading");
  const [isTrainer, setIsTrainer] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (active) setState("error");
          return;
        }

        const data = (await response.json()) as AuthUser;
        const capabilities = getUserCapabilities(data);

        if (!active) return;

        setIsTrainer(capabilities.isTrainer);
        setState("ready");
      } catch {
        if (active) setState("error");
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") {
    return <p className="muted">{t("trainer.loading")}</p>;
  }

  if (state === "error") {
    return <p className="muted">{t("trainer.error")}</p>;
  }

  if (!isTrainer) {
    return <p className="muted">{t("trainer.unauthorized")}</p>;
  }

  return (
    <div className="feature-card">
      <h2 style={{ marginTop: 0 }}>{t("trainer.modeTitle")}</h2>
      <p className="muted">{t("trainer.notAvailable")}</p>
    </div>
  );
}
