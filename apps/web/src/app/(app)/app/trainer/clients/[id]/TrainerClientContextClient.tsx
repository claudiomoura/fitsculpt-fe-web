"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import { hasTrainerClientContextCapability, hasTrainerClientsCapability } from "@/lib/capabilities";
import { getRoleFlags } from "@/lib/roles";

type AuthUser = Record<string, unknown>;

type ClientRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isBlocked: boolean;
  lastLoginAt: string | null;
  subscriptionStatus: string | null;
};

type ClientsResponse = {
  users?: ClientRow[];
};

type LoadState = "loading" | "ready" | "error";
type TabKey = "summary" | "training" | "nutrition" | "tracking";
type SectionState = "loading" | "empty" | "ready" | "error" | "unavailable";

export default function TrainerClientContextClient() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [permissionState, setPermissionState] = useState<LoadState>("loading");
  const [clientState, setClientState] = useState<LoadState>("loading");
  const [canAccessTrainer, setCanAccessTrainer] = useState(false);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("summary");

  const handleRetry = () => {
    window.location.reload();
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
        if (!meResponse.ok) {
          if (active) setPermissionState("error");
          return;
        }

        const meData = (await meResponse.json()) as AuthUser;
        const roleFlags = getRoleFlags(meData);

        if (!active) return;

        const canAccess = roleFlags.isTrainer || roleFlags.isAdmin;
        setCanAccessTrainer(canAccess);
        setPermissionState("ready");

        if (!canAccess) return;

        setClientState("loading");
        const clientsResponse = await fetch("/api/admin/users?page=1", { cache: "no-store" });
        if (!clientsResponse.ok) {
          if (active) setClientState("error");
          return;
        }

        const data = (await clientsResponse.json()) as ClientsResponse;
        if (!active) return;

        if (!hasTrainerClientsCapability(data)) {
          setClient(null);
          setClientState("ready");
          return;
        }

        const users = Array.isArray(data.users) ? data.users : [];
        const selectedClient = users.find((user) => user.id === clientId && user.role !== "ADMIN") ?? null;
        setClient(selectedClient);
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
    return client.name?.trim() || client.email;
  }, [client, t]);

  const tabs: { key: TabKey; label: string }[] = useMemo(
    () => [
      { key: "summary", label: t("trainer.clientContext.summary.title") },
      { key: "training", label: t("trainer.clientContext.training.title") },
      { key: "nutrition", label: t("trainer.clientContext.nutrition.title") },
      { key: "tracking", label: t("trainer.clientContext.tracking.title") },
    ],
    [t],
  );

  const sectionStateByTab = useMemo<Record<TabKey, SectionState>>(() => {
    if (clientState === "loading") {
      return { summary: "loading", training: "loading", nutrition: "loading", tracking: "loading" };
    }

    if (clientState === "error") {
      return { summary: "error", training: "error", nutrition: "error", tracking: "error" };
    }

    if (!client || !hasTrainerClientContextCapability(client)) {
      return { summary: "empty", training: "empty", nutrition: "empty", tracking: "empty" };
    }

    return {
      summary: "ready",
      training: client.subscriptionStatus ? "ready" : "empty",
      nutrition: "unavailable",
      tracking: client.lastLoginAt ? "ready" : "empty",
    };
  }, [client, clientState]);

  const renderSectionBody = (sectionState: SectionState) => {
    if (sectionState === "loading") {
      return (
        <div className="form-stack" role="status" aria-live="polite">
          <p className="muted">{t("trainer.clientContext.loading")}</p>
          <Link href="/app/trainer" className="btn secondary" style={{ width: "fit-content" }}>
            {t("trainer.back")}
          </Link>
        </div>
      );
    }

    if (sectionState === "error") {
      return (
        <div className="form-stack">
          <p className="muted">{t("trainer.clientContext.error")}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn secondary" type="button" onClick={handleRetry}>
              {t("trainer.retry")}
            </button>
            <Link href="/app/trainer" className="btn secondary">
              {t("trainer.back")}
            </Link>
          </div>
        </div>
      );
    }

    if (sectionState === "unavailable") {
      return (
        <div className="form-stack">
          <p className="muted">{t("trainer.clientContext.unavailable")}</p>
          <Link href="/app/trainer" className="btn secondary" style={{ width: "fit-content" }}>
            {t("trainer.back")}
          </Link>
        </div>
      );
    }

    if (sectionState === "empty") {
      return (
        <div className="form-stack">
          <p className="muted">{t("trainer.clientContext.empty")}</p>
          <Link href="/app/trainer" className="btn secondary" style={{ width: "fit-content" }}>
            {t("trainer.back")}
          </Link>
        </div>
      );
    }

    if (activeTab === "summary") {
      return (
        <div className="form-stack">
          <p className="muted" style={{ margin: 0 }}>
            {`${t("trainer.clientContext.summary.clientNamePrefix")} ${clientName}`}
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {`${t("trainer.clientContext.summary.emailPrefix")} ${client?.email ?? "-"}`}
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {`${t("trainer.clientContext.summary.accountStatusPrefix")} ${client?.isBlocked ? t("trainer.clients.blocked") : t("trainer.clients.active")}`}
          </p>
        </div>
      );
    }

    if (activeTab === "training") {
      return (
        <div className="form-stack">
          <p className="muted" style={{ margin: 0 }}>
            {`${t("trainer.clientContext.training.subscriptionStatusPrefix")} ${client?.subscriptionStatus ?? "-"}`}
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {t("trainer.clientContext.training.subscriptionHint")}
          </p>
        </div>
      );
    }

    if (activeTab === "tracking") {
      return (
        <div className="form-stack">
          <p className="muted" style={{ margin: 0 }}>
            {client?.lastLoginAt
              ? `${t("trainer.clientContext.tracking.lastLoginPrefix")} ${new Date(client.lastLoginAt).toLocaleDateString()}`
              : t("trainer.clientContext.tracking.noRecentActivity")}
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {t("trainer.clientContext.tracking.activityHint")}
          </p>
        </div>
      );
    }

    return (
      <div className="form-stack">
        <p className="muted">{t("trainer.clientContext.unavailable")}</p>
        <Link href="/app/trainer" className="btn secondary" style={{ width: "fit-content" }}>
          {t("trainer.back")}
        </Link>
      </div>
    );
  };

  const sectionState = sectionStateByTab[activeTab];

  const tabDescription = useMemo(() => {
    if (sectionState === "loading") return t("trainer.clientContext.stateDescriptions.loading");
    if (sectionState === "error") return t("trainer.clientContext.stateDescriptions.error");
    if (sectionState === "empty") return t("trainer.clientContext.stateDescriptions.empty");
    if (sectionState === "unavailable") return t("trainer.clientContext.stateDescriptions.unavailable");
    return t("trainer.clientContext.stateDescriptions.ready");
  }, [sectionState, t]);

  if (permissionState === "loading") {
    return <p className="muted">{t("trainer.loading")}</p>;
  }

  if (permissionState === "error") {
    return (
      <div className="card form-stack" role="status">
        <p className="muted">{t("trainer.error")}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn secondary" type="button" onClick={handleRetry}>
            {t("trainer.retry")}
          </button>
          <Link href="/app/trainer" className="btn secondary">
            {t("trainer.back")}
          </Link>
        </div>
      </div>
    );
  }

  if (!canAccessTrainer) {
    return (
      <div className="card form-stack" role="status">
        <p className="muted">{t("trainer.unauthorized")}</p>
        <Link href="/app" className="btn secondary" style={{ width: "fit-content" }}>
          {t("trainer.backToDashboard")}
        </Link>
      </div>
    );
  }

  return (
    <div className="form-stack">
      <header className="feature-card form-stack">
        <h2 style={{ margin: 0 }}>{clientName}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {t("trainer.viewingAsCoach")}
        </p>
      </header>

      <section className="card form-stack" aria-label={t("trainer.clientContext.title")}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={activeTab === tab.key ? "btn" : "btn secondary"}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={activeTab === tab.key}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="card form-stack" role="status" aria-live="polite">
          <h3 style={{ margin: 0 }}>{tabs.find((tab) => tab.key === activeTab)?.label}</h3>
          <p className="muted" style={{ margin: 0 }}>
            {tabDescription}
          </p>
          {renderSectionBody(sectionState)}
        </div>
      </section>

      <Link href="/app/trainer" className="btn secondary" style={{ width: "fit-content" }}>
        {t("trainer.back")}
      </Link>
    </div>
  );
}
