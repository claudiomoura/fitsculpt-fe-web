"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import {
  DenseTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeadCell,
  DenseTableRow,
  ProHeader,
} from "@/design-system/components";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { probeTrainerClientsCapability, type TrainerClientsCapability } from "@/lib/trainerCapability";
import TrainerAdminNoGymPanel from "@/components/trainer/TrainerAdminNoGymPanel";
import TrainerGymRequiredState from "@/components/trainer/TrainerGymRequiredState";
import { useTrainerAreaAccess } from "@/components/trainer/useTrainerAreaAccess";

type ListState = "loading" | "ready";

const AT_RISK_STATUS_VALUES = new Set(["at risk", "at_risk", "atrisk", "risk"]);

function toSortableStatusValue(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length ? normalized : null;
}

function getStatusSortPriority(status: string | null): number {
  if (!status) return 2;
  if (AT_RISK_STATUS_VALUES.has(status)) return 0;
  return 1;
}

function readAvatarCandidate(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getClientAvatar(client: { name: string; raw: Record<string, unknown> }): { initials: string; url: string | null } {
  const user = typeof client.raw.user === "object" && client.raw.user !== null ? (client.raw.user as Record<string, unknown>) : null;
  const profile = typeof client.raw.profile === "object" && client.raw.profile !== null ? (client.raw.profile as Record<string, unknown>) : null;

  const rawAvatar = [
    readAvatarCandidate(client.raw.avatarUrl),
    readAvatarCandidate(client.raw.profilePhotoUrl),
    readAvatarCandidate(client.raw.avatarDataUrl),
    readAvatarCandidate(user?.avatarUrl),
    readAvatarCandidate(user?.profilePhotoUrl),
    readAvatarCandidate(user?.avatarDataUrl),
    readAvatarCandidate(profile?.avatarUrl),
    readAvatarCandidate(profile?.profilePhotoUrl),
    readAvatarCandidate(profile?.avatarDataUrl),
  ].find((value) => typeof value === "string" && value.trim().length > 0);

  const initials = client.name
    .split(" ")
    .map((chunk) => chunk.trim().charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return {
    initials: initials || "?",
    url: typeof rawAvatar === "string" ? rawAvatar : null,
  };
}

export default function TrainerClientsListClient() {
  const { t } = useLanguage();
  const { isLoading: accessLoading, gymLoading, gymError, membership, canAccessTrainerArea, canAccessAdminNoGymPanel } = useTrainerAreaAccess();

  const [listState, setListState] = useState<ListState>("loading");
  const [capability, setCapability] = useState<TrainerClientsCapability>({ status: "unavailable" });

  const loadClients = useCallback(async () => {
    setListState("loading");
    const nextCapability = await probeTrainerClientsCapability();
    setCapability(nextCapability);
    setListState("ready");
  }, []);

  useEffect(() => {
    if (!canAccessTrainerArea) return;

    const timeoutId = setTimeout(() => {
      void loadClients();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [canAccessTrainerArea, loadClients]);

  const content = useMemo(() => {
    if (listState === "loading") {
      return <LoadingState ariaLabel={t("trainer.clients.loading")} lines={3} />;
    }

    if (capability.status === "error") {
      if (capability.message === "HTTP_403") {
        return <EmptyState title={t("trainer.unauthorized")} description={t("trainer.clients.forbiddenHint")} wrapInCard icon="warning" />;
      }

      return <ErrorState title={t("trainer.clients.error")} retryLabel={t("ui.retry")} onRetry={() => void loadClients()} wrapInCard />;
    }

    if (capability.status === "unavailable") {
      return <EmptyState title={t("trainer.unavailableTitle")} description={t("trainer.unavailableDesc")} wrapInCard icon="info" />;
    }

    if (!capability.clients.length) {
      return <EmptyState title={t("trainer.clients.empty")} wrapInCard icon="info" />;
    }

    const hasStatusData = capability.clients.some((client) => toSortableStatusValue(client.subscriptionStatus) !== null);
    const clients = hasStatusData
      ? [...capability.clients].sort((left, right) => {
        const leftStatus = toSortableStatusValue(left.subscriptionStatus);
        const rightStatus = toSortableStatusValue(right.subscriptionStatus);

        const priorityDiff = getStatusSortPriority(leftStatus) - getStatusSortPriority(rightStatus);
        if (priorityDiff !== 0) return priorityDiff;

        if (leftStatus && rightStatus) {
          const statusDiff = leftStatus.localeCompare(rightStatus);
          if (statusDiff !== 0) return statusDiff;
        }

        return left.name.localeCompare(right.name);
      })
      : capability.clients;

    return (
      <section className="form-stack" aria-label={t("trainer.clients.title")}>
        <ProHeader
          title={t("trainer.clients.title")}
          subtitle={t("trainer.clients.openClientAriaPrefix")}
          compact
        />
        <DenseTable>
          <DenseTableHead>
            <DenseTableRow>
              <DenseTableHeadCell>{t("trainer.clients.title")}</DenseTableHeadCell>
              <DenseTableHeadCell>{t("trainer.clients.active")}</DenseTableHeadCell>
              <DenseTableHeadCell className="text-right">{t("admin.actions")}</DenseTableHeadCell>
            </DenseTableRow>
          </DenseTableHead>
          <DenseTableBody>
            {clients.map((client) => {
              const statusText = client.isBlocked ? t("trainer.clients.blocked") : t("trainer.clients.active");
              const avatar = getClientAvatar(client);

              return (
                <DenseTableRow key={client.id} interactive>
                  <DenseTableCell>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        aria-hidden="true"
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 999,
                          overflow: "hidden",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          background: "var(--bg-muted)",
                          color: "var(--text-primary)",
                          flexShrink: 0,
                        }}
                      >
                        {avatar.url ? (
                          <img
                            src={avatar.url}
                            alt={t("trainer.clients.avatarAlt").replace("{name}", client.name)}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          avatar.initials
                        )}
                      </span>
                      <span className="form-stack" style={{ gap: 1, minWidth: 0 }}>
                        <strong style={{ overflowWrap: "anywhere" }}>{client.name}</strong>
                        {client.email ? <span className="muted" style={{ margin: 0, overflowWrap: "anywhere" }}>{client.email}</span> : null}
                      </span>
                    </div>
                  </DenseTableCell>
                  <DenseTableCell>
                    <div className="form-stack" style={{ gap: 2 }}>
                      <Badge variant={client.isBlocked ? "danger" : "success"}>{statusText}</Badge>
                      <span className="muted">{client.subscriptionStatus ?? t("ui.notAvailable")}</span>
                    </div>
                  </DenseTableCell>
                  <DenseTableCell className="text-right">
                    <Link
                      href={`/app/trainer/clients/${client.id}`}
                      className="btn secondary"
                      aria-label={`${t("trainer.clients.openClientAriaPrefix")} ${client.name}`}
                    >
                      {t("ui.edit")}
                    </Link>
                  </DenseTableCell>
                </DenseTableRow>
              );
            })}
          </DenseTableBody>
        </DenseTable>
      </section>
    );
  }, [capability, listState, loadClients, t]);

  if (accessLoading || gymLoading) {
    return <LoadingState ariaLabel={t("trainer.loading")} lines={2} />;
  }

  if (canAccessAdminNoGymPanel) {
    return <TrainerAdminNoGymPanel />;
  }

  if (!canAccessTrainerArea) {
    if (membership.state === "not_in_gym") {
      return <TrainerGymRequiredState />;
    }

    if (gymError) {
      return <ErrorState title={t("trainer.error")} retryLabel={t("ui.retry")} onRetry={() => window.location.reload()} wrapInCard />;
    }

    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return content;
}
