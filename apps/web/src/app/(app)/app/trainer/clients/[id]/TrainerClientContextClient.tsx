"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { type GymMembership } from "@/lib/gymMembership";
import { getRoleFlags } from "@/lib/roles";
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
  avatarUrl: string | null;
};

type LoadState = "loading" | "ready" | "error";
type MembershipState = "in_gym" | "not_in_gym" | "unknown" | "no_permission";

type RemoveCapability = {
  loading: boolean;
  supported: boolean;
};

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

function canAccessTrainerGymArea(input: { isAdmin: boolean; isCoach: boolean; membership: GymMembership }): boolean {
  return (input.isAdmin || input.isCoach) && input.membership.state === "in_gym";
}

function getRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function normalizeClient(payload: unknown, clientId: string): ClientRow | null {
  const root = getRecord(payload);
  const data = getRecord(root.data);
  const source = Object.keys(data).length > 0 ? data : root;

  const normalizedId = asString(source.id) ?? asString(source.userId) ?? asString(source.clientId);
  if (!normalizedId || normalizedId !== clientId) return null;

  const email = asString(source.email);
  if (!email) return null;

  return {
    id: normalizedId,
    email,
    name: asString(source.name) ?? asString(source.fullName) ?? null,
    role: asString(source.role) ?? "",
    isBlocked: Boolean(source.isBlocked),
    lastLoginAt: asString(source.lastLoginAt),
    subscriptionStatus: asString(source.subscriptionStatus),
    avatarUrl:
      asString(source.avatarUrl) ??
      asString(source.profilePhotoUrl) ??
      asString(source.avatarDataUrl) ??
      asString(source.profileImageUrl),
  };
}

export default function TrainerClientContextClient() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clientId = params.id;

  const [permissionState, setPermissionState] = useState<LoadState>("loading");
  const [clientState, setClientState] = useState<LoadState>("loading");
  const [canAccessTrainer, setCanAccessTrainer] = useState(false);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [membershipState, setMembershipState] = useState<MembershipState>("unknown");
  const [clientForbidden, setClientForbidden] = useState(false);
  const [removeCapability, setRemoveCapability] = useState<RemoveCapability>({ loading: true, supported: false });
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [removingClient, setRemovingClient] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [meResponse, gymResponse] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/gym/me", { cache: "no-store", credentials: "include" }),
        ]);

        if (!meResponse.ok || !gymResponse.ok) {
          if (active) {
            setPermissionState("error");
          }
          return;
        }

        const meData = (await meResponse.json()) as AuthUser;
        const gymPayload = (await gymResponse.json()) as unknown;
        const roleFlags = getRoleFlags(meData);
        const gymMembership = toGymMembership(gymPayload);

        if (!active) return;

        setMembershipState(gymMembership.state as MembershipState);

        const canAccess = canAccessTrainerGymArea({ isAdmin: roleFlags.isAdmin, isCoach: roleFlags.isTrainer, membership: gymMembership });
        setCanAccessTrainer(canAccess);
        setPermissionState("ready");

        if (!canAccess) return;

        setClientState("loading");
        setClientForbidden(false);
        const detailResponse = await fetch(`/api/trainer/clients/${clientId}`, { cache: "no-store", credentials: "include" });

        if (!active) return;

        if (detailResponse.status === 403) {
          setClientForbidden(true);
          setClientState("ready");
          return;
        }

        if (detailResponse.status === 404) {
          setClient(null);
          setClientState("ready");
          return;
        }

        if (!detailResponse.ok) {
          setClientState("error");
          return;
        }

        const payload = (await detailResponse.json()) as unknown;
        const normalized = normalizeClient(payload, clientId);
        setClient(normalized);
        setClientState("ready");
      } catch {
        if (!active) return;
        setPermissionState("error");
        setClientState("error");
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [clientId]);

  useEffect(() => {
    let active = true;

    const probeRemoveCapability = async () => {
      setRemoveCapability({ loading: true, supported: false });

      try {
        const response = await fetch(`/api/trainer/clients/${clientId}`, {
          method: "OPTIONS",
          cache: "no-store",
          credentials: "include",
        });

        const allowHeader = response.headers.get("allow") ?? response.headers.get("Allow") ?? "";
        const supported = response.ok && allowHeader.toUpperCase().includes("DELETE");

        if (!active) return;
        setRemoveCapability({ loading: false, supported });
      } catch (_err) {
        if (!active) return;
        setRemoveCapability({ loading: false, supported: false });
      }
    };

    void probeRemoveCapability();
    return () => {
      active = false;
    };
  }, [clientId]);

  const clientName = useMemo(() => {
    if (!client) return t("trainer.clientContext.unknownClient");
    return client.name?.trim() || client.email;
  }, [client, t]);

  const initials = useMemo(() => {
    return clientName
      .split(" ")
      .map((chunk) => chunk.trim().charAt(0).toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join("") || "?";
  }, [clientName]);

  const removeClientRelation = useCallback(async () => {
    if (!client || !removeCapability.supported) return;

    setRemovingClient(true);
    setRemoveError(null);

    try {
      const response = await fetch(`/api/trainer/clients/${client.id}`, {
        method: "DELETE",
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        setRemoveError(t("trainer.clientContext.removeClient.submitError"));
        setRemovingClient(false);
        return;
      }

      setRemovingClient(false);
      setRemoveModalOpen(false);
      router.push("/app/trainer/clients");
      router.refresh();
    } catch (_err) {
      setRemoveError(t("trainer.clientContext.removeClient.submitError"));
      setRemovingClient(false);
    }
  }, [client, removeCapability.supported, router, t]);

  if (permissionState === "loading") {
    return <LoadingState ariaLabel={t("trainer.loading")} lines={2} />;
  }

  if (permissionState === "error") {
    return <ErrorState title={t("trainer.error")} retryLabel={t("trainer.retry")} onRetry={handleRetry} wrapInCard />;
  }

  if (!canAccessTrainer) {
    const noGymMessage =
      membershipState === "not_in_gym"
        ? { title: t("trainer.gymRequiredTitle"), description: t("trainer.gymRequiredDesc") }
        : membershipState === "unknown"
          ? { title: t("trainer.gymUnknownTitle"), description: t("trainer.gymUnknownDesc") }
          : membershipState === "no_permission"
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

  if (clientState === "loading") {
    return <LoadingState ariaLabel={t("trainer.clientContext.loading")} lines={3} />;
  }

  if (clientState === "error") {
    return <ErrorState title={t("trainer.clientContext.error")} retryLabel={t("trainer.retry")} onRetry={handleRetry} wrapInCard />;
  }

  if (clientForbidden) {
    return <EmptyState title={t("trainer.clientContext.forbiddenHint")} wrapInCard icon="warning" />;
  }

  if (!client) {
    return <EmptyState title={t("trainer.clientContext.empty")} wrapInCard icon="info" />;
  }

  const statusText = client.isBlocked ? t("trainer.clients.blocked") : t("trainer.clients.active");

  return (
    <div className="form-stack">
      <header className="feature-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
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
          {client.avatarUrl ? (
            <img
              src={client.avatarUrl}
              alt={t("trainer.clients.avatarAlt").replace("{name}", clientName)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials
          )}
        </span>

        <div className="form-stack" style={{ gap: 2, minWidth: 0 }}>
          <h2 style={{ margin: 0, overflowWrap: "anywhere" }}>{clientName}</h2>
          <p className="muted" style={{ margin: 0, overflowWrap: "anywhere" }}>{client.email}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge variant={client.isBlocked ? "danger" : "success"}>{statusText}</Badge>
            {client.subscriptionStatus ? <Badge variant="muted">{client.subscriptionStatus}</Badge> : null}
          </div>
        </div>
      </header>

      <section className="card form-stack" aria-label={t("trainer.clientContext.training.title")}>
        <h3 style={{ margin: 0 }}>{t("trainer.clientContext.training.title")}</h3>
        <p className="muted" style={{ margin: 0 }}>
          {`${t("trainer.clientContext.training.subscriptionStatusPrefix")} ${client.subscriptionStatus ?? "-"}`}
        </p>
        <TrainerMemberPlanAssignmentCard memberId={client.id} memberName={clientName} />
        <TrainerClientDraftActions clientId={client.id} />
      </section>

      <section className="card form-stack" aria-label={t("trainer.clientContext.removeClient.title")}>
        <h3 style={{ margin: 0 }}>{t("trainer.clientContext.removeClient.title")}</h3>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.clientContext.removeClient.description")}</p>
        {!removeCapability.loading && !removeCapability.supported ? (
          <p className="muted" style={{ margin: 0 }}>{t("trainer.clientContext.removeClient.unsupported")}</p>
        ) : null}
        <button
          type="button"
          className="btn danger"
          style={{ width: "fit-content" }}
          disabled={removeCapability.loading || !removeCapability.supported}
          onClick={() => {
            setRemoveError(null);
            setRemoveModalOpen(true);
          }}
        >
          {t("trainer.clientContext.removeClient.openConfirm")}
        </button>
      </section>

      <Link href="/app/trainer/clients" className="btn secondary" style={{ width: "fit-content" }}>
        {t("trainer.back")}
      </Link>

      <Modal
        open={removeModalOpen}
        onClose={() => setRemoveModalOpen(false)}
        title={t("trainer.clientContext.removeClient.modalTitle")}
        description={t("trainer.clientContext.removeClient.modalDescription").replace("{member}", clientName)}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" className="btn secondary" onClick={() => setRemoveModalOpen(false)}>
              {t("ui.cancel")}
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => void removeClientRelation()}
              disabled={!removeCapability.supported || removingClient}
            >
              {removingClient ? t("trainer.clientContext.removeClient.submitting") : t("trainer.clientContext.removeClient.confirm")}
            </button>
          </div>
        }
      >
        <div className="form-stack" style={{ paddingTop: 8 }}>
          <p className="muted" style={{ margin: 0 }}>
            {t("trainer.clientContext.removeClient.modalWarning")}
          </p>
          {!removeCapability.loading && !removeCapability.supported ? (
            <p className="muted" style={{ margin: 0 }}>
              {t("trainer.clientContext.removeClient.unsupported")}
            </p>
          ) : null}
          {removeError ? <p className="muted" style={{ margin: 0 }}>{removeError}</p> : null}
        </div>
      </Modal>
    </div>
  );
}
