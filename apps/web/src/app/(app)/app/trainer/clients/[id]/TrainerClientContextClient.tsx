"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import { hasTrainerClientContextCapability } from "@/lib/capabilities";
import { canAccessTrainerGymArea, type GymMembership } from "@/lib/gymMembership";
import { getRoleFlags } from "@/lib/roles";
import { fetchGymMembershipStatus, parseGymMembership } from "@/services/gym";
import TrainerClientDraftActions from "@/components/trainer/TrainerClientDraftActions";
import TrainerMemberPlanAssignmentCard from "@/components/trainer/TrainerMemberPlanAssignmentCard";

type AuthUser = Record<string, unknown>;

type ClientRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isBlocked: boolean;
  lastLoginAt: string | null;
  subscriptionStatus: string | null;
  plans?: unknown;
};

type LoadState = "loading" | "ready" | "error";
type TabKey = "summary" | "training" | "nutrition" | "tracking";
type SectionState = "loading" | "empty" | "ready" | "error" | "unavailable";


function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function toGymMembership(payload: unknown): GymMembership {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const data = typeof source.data === "object" && source.data !== null ? (source.data as Record<string, unknown>) : source;
  const gym = typeof data.gym === "object" && data.gym !== null ? (data.gym as Record<string, unknown>) : null;

  const rawStatus = asString(data.state ?? data.status)?.toUpperCase();
  const gymId = asString(data.gymId) ?? asString(data.tenantId) ?? asString(gym?.id);
  const gymName = asString(data.gymName) ?? asString(data.tenantName) ?? asString(gym?.name);

  if (rawStatus === "ACTIVE") return { state: "in_gym", gymId, gymName };
  if (rawStatus === "NONE" || rawStatus === "PENDING" || rawStatus === "REJECTED") {
    return { state: "not_in_gym", gymId, gymName };
  }

  return { state: "unknown", gymId: null, gymName: null };
}

export default function TrainerClientContextClient() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [permissionState, setPermissionState] = useState<LoadState>("loading");
  const [clientState, setClientState] = useState<LoadState>("loading");
  const [canAccessTrainer, setCanAccessTrainer] = useState(false);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const [gymMembershipState, setGymMembershipState] = useState<"in_gym" | "not_in_gym" | "unknown" | "no_permission">("unknown");

  const handleRetry = () => {
    window.location.reload();
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [meResponse, gymResponse] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/gym/me", { cache: "no-store", credentials: "include" }),
        ]);
        if (!meResponse.ok || !gymResponse.ok) {
          if (active) setPermissionState("error");
          return;
        }

        const meData = (await meResponse.json()) as AuthUser;
        const gymPayload = (await gymResponse.json()) as unknown;
        const roleFlags = getRoleFlags(meData);
        const gymMembership = toGymMembership(gymPayload);

        if (!active) return;

        setGymMembershipState(membershipState);
        const canAccess = (roleFlags.isTrainer || roleFlags.isAdmin) && membershipState === "in_gym";
        setCanAccessTrainer(canAccess);
        setPermissionState("ready");

        if (!canAccess) return;

        setClientState("loading");
        const trainerClientResponse = await fetch(`/api/trainer/clients/${clientId}`, { cache: "no-store" });

        if (trainerClientResponse.status === 404) {
          if (active) {
            setClient(null);
            setClientState("ready");
          }
          return;
        }

        if (!trainerClientResponse.ok) {
          if (active) setClientState("error");
          return;
        }

        const trainerClient = (await trainerClientResponse.json()) as ClientRow;
        if (!active) return;

        setClient(trainerClient);
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

    return { summary: "ready", training: "ready", nutrition: "empty", tracking: "ready" };
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
          {client ? <TrainerMemberPlanAssignmentCard memberId={client.id} memberName={clientName} /> : null}
          {client ? <TrainerClientDraftActions clientId={client.id} /> : null}
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
    const noGymMessage =
      gymMembershipState === "not_in_gym"
        ? { title: t("trainer.gymRequiredTitle"), description: t("trainer.gymRequiredDesc") }
        : gymMembershipState === "unknown"
          ? { title: t("trainer.gymUnknownTitle"), description: t("trainer.gymUnknownDesc") }
          : gymMembershipState === "no_permission"
            ? { title: t("trainer.unauthorized"), description: t("trainer.unavailableDesc") }
            : null;

    return (
      <div className="card form-stack" role="status">
        <p className="muted">{noGymMessage?.title ?? t("trainer.unauthorized")}</p>
        {noGymMessage?.description ? <p className="muted">{noGymMessage.description}</p> : null}
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
