"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { canAccessTrainerGymArea, type GymMembership } from "@/lib/gymMembership";
import { useAccess } from "@/lib/useAccess";
import TrainerPlanAssignmentPanel from "@/components/trainer/TrainerPlanAssignmentPanel";

type MembershipViewState = "loading" | "ready";
type MembershipGate = "in_gym" | "not_in_gym" | "unknown" | "no_permission";

type MembershipStatus = "NONE" | "PENDING" | "ACTIVE" | "REJECTED" | "UNKNOWN";

const UNKNOWN_MEMBERSHIP: GymMembership = { state: "unknown", gymId: null, gymName: null };

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function normalizeStatus(value: unknown): MembershipStatus {
  const normalized = asString(value)?.trim().toUpperCase();
  if (normalized === "NONE" || normalized === "PENDING" || normalized === "ACTIVE" || normalized === "REJECTED") {
    return normalized;
  }
  return "UNKNOWN";
}

function toGymMembership(payload: unknown): GymMembership {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const data = typeof source.data === "object" && source.data !== null ? (source.data as Record<string, unknown>) : source;
  const gym = typeof data.gym === "object" && data.gym !== null ? (data.gym as Record<string, unknown>) : null;

  const status = normalizeStatus(data.state ?? data.status);
  const gymId = asString(data.gymId) ?? asString(data.tenantId) ?? asString(gym?.id);
  const gymName = asString(data.gymName) ?? asString(data.tenantName) ?? asString(gym?.name);

  if (status === "ACTIVE") {
    return { state: "in_gym", gymId, gymName };
  }

  if (status === "NONE" || status === "PENDING" || status === "REJECTED") {
    return { state: "not_in_gym", gymId, gymName };
  }

  return UNKNOWN_MEMBERSHIP;
}

export default function TrainerHomeClient() {
  const { t } = useLanguage();
  const { isCoach, isAdmin, isLoading: accessLoading } = useAccess();
  const [membership, setMembership] = useState<GymMembership>(UNKNOWN_MEMBERSHIP);
  const [gymLoading, setGymLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadMembership = async () => {
      setGymLoading(true);
      try {
        const response = await fetch("/api/gym/me", { cache: "no-store", credentials: "include" });
        if (!response.ok) {
          if (active) setMembership(UNKNOWN_MEMBERSHIP);
          return;
        }

        const payload = (await response.json()) as unknown;
        if (!active) return;
        setMembership(toGymMembership(payload));
      } catch {
        if (!active) return;
        setMembership(UNKNOWN_MEMBERSHIP);
      } finally {
        if (active) setGymLoading(false);
      }
    };

    void loadMembership();

    return () => {
      active = false;
    };
  }, []);

  const canAccessTrainer = useMemo(
    () => canAccessTrainerGymArea({ isCoach, isAdmin, membership }),
    [isAdmin, isCoach, membership],
  );

  const membershipViewState: MembershipViewState = gymLoading ? "loading" : "ready";

  const membershipGate: MembershipGate = useMemo(() => {
    if (!(isCoach || isAdmin)) return "no_permission";
    if (membership.state === "in_gym") return "in_gym";
    if (membership.state === "not_in_gym") return "not_in_gym";
    return "unknown";
  }, [isAdmin, isCoach, membership.state]);

  if (accessLoading || membershipViewState === "loading") {
    return <LoadingState ariaLabel={t("trainer.loading")} lines={2} />;
  }

  if (!canAccessTrainer) {
    if (membershipGate === "not_in_gym") {
      return <EmptyState title={t("trainer.gymRequiredTitle")} description={t("trainer.gymRequiredDesc")} wrapInCard icon="info" />;
    }

    if (membershipGate === "unknown") {
      return <EmptyState title={t("trainer.gymUnknownTitle")} description={t("trainer.gymUnknownDesc")} wrapInCard icon="info" />;
    }

    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return (
    <div className="form-stack">
      <div className="feature-card form-stack">
        <h2 style={{ margin: 0 }}>{t("trainer.modeTitle")}</h2>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.viewingAsCoach")}</p>
        {membership.gymName ? <p className="muted" style={{ margin: 0 }}>{membership.gymName}</p> : null}
      </div>

      <section className="card form-stack" aria-labelledby="trainer-clients-title">
        <h2 id="trainer-clients-title" className="section-title" style={{ fontSize: 20 }}>
          {t("trainer.clients.title")}
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          {t("trainer.clients.description")}
        </p>
        <Link href="/app/trainer/clients" className="btn secondary fit-content">
          {t("trainer.clients.openList")}
        </Link>
      </section>

      <section className="card form-stack" aria-labelledby="trainer-athlete-context-title">
        <h3 id="trainer-athlete-context-title" style={{ margin: 0 }}>
          {t("trainer.clientContext.title")}
        </h3>
        <p className="muted" style={{ margin: 0 }}>
          {t("trainer.clientContext.nextStep")}
        </p>
      </section>

      <TrainerPlanAssignmentPanel />
    </div>
  );
}
