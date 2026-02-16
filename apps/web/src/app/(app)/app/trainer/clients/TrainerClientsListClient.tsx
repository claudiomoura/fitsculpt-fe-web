"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { canAccessTrainerGymArea, type GymMembership } from "@/lib/gymMembership";
import { probeTrainerClientsCapability, type TrainerClientsCapability } from "@/lib/trainerCapability";
import { useAccess } from "@/lib/useAccess";

type ListState = "loading" | "ready";
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

export default function TrainerClientsListClient() {
  const { t } = useLanguage();
  const { isCoach, isAdmin, isLoading: accessLoading } = useAccess();

  const [membership, setMembership] = useState<GymMembership>(UNKNOWN_MEMBERSHIP);
  const [gymLoading, setGymLoading] = useState(true);
  const [listState, setListState] = useState<ListState>("loading");
  const [capability, setCapability] = useState<TrainerClientsCapability>({ status: "unavailable" });

  const canAccessTrainer = useMemo(
    () => canAccessTrainerGymArea({ isCoach, isAdmin, membership }),
    [isAdmin, isCoach, membership],
  );

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

  const loadClients = useCallback(async () => {
    setListState("loading");
    const nextCapability = await probeTrainerClientsCapability();
    setCapability(nextCapability);
    setListState("ready");
  }, []);

  useEffect(() => {
    if (!canAccessTrainer) return;

    const timeoutId = setTimeout(() => {
      void loadClients();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [canAccessTrainer, loadClients]);

  const content = useMemo(() => {
    if (listState === "loading") {
      return <LoadingState ariaLabel={t("trainer.clients.loading")} lines={3} />;
    }

    if (capability.status === "error") {
      return <ErrorState title={t("trainer.clients.error")} retryLabel={t("ui.retry")} onRetry={() => void loadClients()} wrapInCard />;
    }

    if (capability.status === "unavailable") {
      return <EmptyState title={t("trainer.unavailableTitle")} description={t("trainer.unavailableDesc")} wrapInCard icon="info" />;
    }

    if (!capability.clients.length) {
      return <EmptyState title={t("trainer.clients.empty")} wrapInCard icon="info" />;
    }

    return (
      <ul className="form-stack" aria-label={t("trainer.clients.title")}>
        {capability.clients.map((client) => {
          const statusText = client.isBlocked ? t("trainer.clients.blocked") : t("trainer.clients.active");

          return (
            <li key={client.id} className="card">
              <Link href={`/app/trainer/clients/${client.id}`} className="sidebar-link" style={{ display: "block" }}>
                <strong>{client.name}</strong>
              </Link>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                {statusText}
                {client.subscriptionStatus ? ` · ${client.subscriptionStatus}` : ""}
              </p>
            </li>
          );
        })}
      </ul>
    );
  }, [capability, listState, loadClients, t]);

  if (accessLoading || gymLoading) {
    return <LoadingState ariaLabel={t("trainer.loading")} lines={2} />;
  }

  if (!canAccessTrainer) {
    if (membership.state === "not_in_gym") {
      return <EmptyState title={t("trainer.gymRequiredTitle")} description={t("trainer.gymRequiredDesc")} wrapInCard icon="info" />;
    }

    if (membership.state === "unknown") {
      return <EmptyState title={t("trainer.gymUnknownTitle")} description={t("trainer.gymUnknownDesc")} wrapInCard icon="info" />;
    }

    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return content;
}
