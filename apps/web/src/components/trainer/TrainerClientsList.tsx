"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { probeTrainerClientsCapability, type TrainerClientsCapability } from "@/lib/trainerCapability";
import { useAccess } from "@/lib/useAccess";
import { fetchMyGymMembership } from "@/services/gym";

type ListState = "loading" | "ready";
type MembershipGate = "in_gym" | "not_in_gym" | "error" | "no_permission";

export default function TrainerClientsList() {
  const { t } = useLanguage();
  const { isCoach, isAdmin, isLoading: accessLoading } = useAccess();

  const [membershipLoading, setMembershipLoading] = useState(true);
  const [membershipGate, setMembershipGate] = useState<MembershipGate>("error");
  const [listState, setListState] = useState<ListState>("loading");
  const [capability, setCapability] = useState<TrainerClientsCapability>({ status: "unavailable" });

  const canAccessTrainer = useMemo(
    () => membershipGate === "in_gym" && (isCoach || isAdmin),
    [isAdmin, isCoach, membershipGate],
  );

  const loadMembership = useCallback(async () => {
    setMembershipLoading(true);
    const membershipResult = await fetchMyGymMembership();

    if (!membershipResult.ok) {
      setMembershipGate(membershipResult.reason === "unauthorized" || membershipResult.reason === "forbidden" ? "no_permission" : "error");
      setMembershipLoading(false);
      return;
    }

    setMembershipGate(membershipResult.data.status === "ACTIVE" ? "in_gym" : "not_in_gym");
    setMembershipLoading(false);
  }, []);

  const loadClients = useCallback(async () => {
    setListState("loading");
    const nextCapability = await probeTrainerClientsCapability();
    setCapability(nextCapability);
    setListState("ready");
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMembership();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadMembership]);

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
      return (
        <ErrorState
          title={t("trainer.clients.error")}
          retryLabel={t("ui.retry")}
          onRetry={() => void loadClients()}
          wrapInCard
        />
      );
    }

    if (capability.status === "unavailable") {
      return (
        <EmptyState
          title={t("trainer.unavailableTitle")}
          description={t("trainer.unavailableDesc")}
          wrapInCard
          icon="info"
        />
      );
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

  if (accessLoading || membershipLoading) {
    return <LoadingState ariaLabel={t("trainer.loading")} lines={2} />;
  }

  if (!canAccessTrainer) {
    if (membershipGate === "not_in_gym") {
      return <EmptyState title={t("trainer.gymRequiredTitle")} description={t("trainer.gymRequiredDesc")} wrapInCard icon="info" />;
    }

    if (membershipGate === "error") {
      return <ErrorState title={t("trainer.error")} retryLabel={t("ui.retry")} onRetry={() => void loadMembership()} wrapInCard />;
    }

    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return content;
}
