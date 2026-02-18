"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { probeTrainerClientsCapability, type TrainerClientsCapability } from "@/lib/trainerCapability";
import TrainerAdminNoGymPanel from "@/components/trainer/TrainerAdminNoGymPanel";
import { useTrainerAreaAccess } from "@/components/trainer/useTrainerAreaAccess";

type ListState = "loading" | "ready";

function getClientAvatar(client: { name: string; raw: Record<string, unknown> }): { initials: string; url: string | null } {
  const rawAvatar = [client.raw.avatarUrl, client.raw.profilePhotoUrl, client.raw.avatarDataUrl].find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

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
  const { isLoading: accessLoading, gymLoading, membership, canAccessTrainerArea, canAccessAdminNoGymPanel } = useTrainerAreaAccess();

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
          const avatar = getClientAvatar(client);

          return (
            <li key={client.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <Link
                href={`/app/trainer/clients/${client.id}`}
                className="sidebar-link"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  textDecoration: "none",
                }}
                aria-label={`${t("trainer.clients.openClientAriaPrefix")} ${client.name}`}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    overflow: "hidden",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    background: "color-mix(in srgb, var(--bg-muted) 70%, #0ea5e9 30%)",
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

                <span className="form-stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                  <strong style={{ overflowWrap: "anywhere" }}>{client.name}</strong>
                  {client.email ? (
                    <span className="muted" style={{ margin: 0, overflowWrap: "anywhere" }}>
                      {client.email}
                    </span>
                  ) : null}
                  <span className="muted" style={{ margin: 0 }}>
                    {client.subscriptionStatus ?? t("trainer.clients.unknownStatus")}
                  </span>
                </span>

                <Badge variant={client.isBlocked ? "danger" : "success"}>{statusText}</Badge>
              </Link>
            </li>
          );
        })}
      </ul>
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
      return <EmptyState title={t("trainer.gymRequiredTitle")} description={t("trainer.gymRequiredDesc")} wrapInCard icon="info" />;
    }

    if (membership.state === "unknown") {
      return <EmptyState title={t("trainer.gymUnknownTitle")} description={t("trainer.gymUnknownDesc")} wrapInCard icon="info" />;
    }

    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return content;
}
