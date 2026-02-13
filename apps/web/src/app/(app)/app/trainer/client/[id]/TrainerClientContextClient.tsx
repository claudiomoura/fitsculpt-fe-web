"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import FeatureUnavailableState from "@/components/trainer/FeatureUnavailableState";
import { useLanguage } from "@/context/LanguageProvider";
import { getUserRoleFlags } from "@/lib/userCapabilities";
import { findTrainerClient, hasClientContextData, type TrainerClient } from "@/lib/trainerClients";

type LoadState = "loading" | "ready" | "error";

export default function TrainerClientContextClient() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [permissionState, setPermissionState] = useState<LoadState>("loading");
  const [clientState, setClientState] = useState<LoadState>("loading");
  const [canAccessTrainer, setCanAccessTrainer] = useState(false);
  const [client, setClient] = useState<TrainerClient | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
        if (!meResponse.ok) {
          if (active) setPermissionState("error");
          return;
        }

        const meData = (await meResponse.json()) as Record<string, unknown>;
        const roleFlags = getUserRoleFlags(meData);

        if (!active) return;

        const canAccess = roleFlags.isTrainer || roleFlags.isAdmin;
        setCanAccessTrainer(canAccess);
        setPermissionState("ready");

        if (!canAccess) return;

        setClientState("loading");
        const profileResponse = await fetch("/api/profile", { cache: "no-store" });
        if (!profileResponse.ok) {
          if (active) setClientState("error");
          return;
        }

        const profileData = (await profileResponse.json()) as unknown;
        if (!active) return;

        setClient(findTrainerClient(profileData, clientId));
        setClientState("ready");
      } catch {
        if (active) {
          setPermissionState("error");
          setClientState("error");
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [clientId]);

  const clientName = useMemo(() => {
    if (!client) return t("trainer.clientContext.unknownClient");
    return client.name;
  }, [client, t]);

  if (permissionState === "loading") {
    return <p className="muted">{t("trainer.loading")}</p>;
  }

  if (permissionState === "error") {
    return <p className="muted">{t("trainer.error")}</p>;
  }

  if (!canAccessTrainer) {
    return (
      <div className="card form-stack" role="status">
        <p className="muted">{t("trainer.unauthorized")}</p>
        <Link href="/app" className="btn secondary" style={{ width: "fit-content", minHeight: 44 }}>
          {t("trainer.backToDashboard")}
        </Link>
      </div>
    );
  }

  if (clientState === "loading") {
    return <p className="muted">{t("trainer.clientContext.loading")}</p>;
  }

  if (clientState === "error") {
    return (
      <div className="card form-stack" role="status">
        <p className="muted">{t("trainer.clientContext.error")}</p>
        <Link href="/app/trainer" className="btn secondary" style={{ width: "fit-content", minHeight: 44 }}>
          {t("trainer.back")}
        </Link>
      </div>
    );
  }

  if (!client || !hasClientContextData(client.raw)) {
    return <FeatureUnavailableState />;
  }

  return (
    <div className="form-stack">
      <header className="feature-card form-stack">
        <h2 style={{ margin: 0 }}>{clientName}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {t("trainer.viewingAsCoach")}
        </p>
      </header>

      <section className="card form-stack" aria-labelledby="trainer-client-summary-title">
        <h3 id="trainer-client-summary-title" style={{ margin: 0 }}>
          {t("trainer.clientContext.today.title")}
        </h3>
        <p className="muted" style={{ margin: 0 }}>
          {client.subscriptionStatus
            ? `${t("trainer.clientContext.today.subscriptionStatusPrefix")} ${client.subscriptionStatus}`
            : t("trainer.clientContext.unavailable")}
        </p>
      </section>

      <Link href="/app/trainer" className="btn secondary" style={{ width: "fit-content", minHeight: 44 }}>
        {t("trainer.back")}
      </Link>
    </div>
  );
}
