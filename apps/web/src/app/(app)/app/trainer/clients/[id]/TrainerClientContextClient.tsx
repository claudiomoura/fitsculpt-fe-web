"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { hasTrainerClientContextCapability } from "@/lib/capabilities";
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
};

type LoadState = "loading" | "ready" | "error";

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

export default function TrainerClientContextClient() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clientId = params.id;

  const [permissionState, setPermissionState] = useState<LoadState>("loading");
  const [clientState, setClientState] = useState<LoadState>("loading");
  const [canAccessTrainer, setCanAccessTrainer] = useState(false);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [gymMembershipState, setGymMembershipState] = useState<"in_gym" | "not_in_gym" | "unknown" | "no_permission">("unknown");
  const [clientForbidden, setClientForbidden] = useState(false);

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
          if (active) setPermissionState("error");
          return;
        }

        const meData = (await meResponse.json()) as AuthUser;
        const gymPayload = (await gymResponse.json()) as unknown;
        const roleFlags = getRoleFlags(meData);
        const gymMembership = toGymMembership(gymPayload);

        if (!active) return;

        const nextMembershipState = gymMembership.state;
        setGymMembershipState(nextMembershipState);

        const canAccess = canAccessTrainerGymArea(roleFlags, gymMembership);
        setCanAccessTrainer(canAccess);
        setPermissionState("ready");

        if (!canAccess) return;

        setClientState("loading");
        setClientForbidden(false);
        const trainerClientResponse = await fetch(`/api/trainer/clients/${clientId}`, { cache: "no-store" });

        if (trainerClientResponse.status === 403) {
          if (active) {
            setClientForbidden(true);
            setClientState("ready");
          }
          return;
        }

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

        setClientForbidden(false);
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
      } catch {
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

  const statusText = client?.isBlocked ? t("trainer.clients.blocked") : t("trainer.clients.active");

  const removeClientRelation = useCallback(async () => {
    if (!removeCapability.supported || !client) return;

    if (clientForbidden) {
      return { summary: "unavailable", training: "unavailable", nutrition: "unavailable", tracking: "unavailable" };
    }

    if (!client || !hasTrainerClientContextCapability(client)) {
      return { summary: "empty", training: "empty", nutrition: "empty", tracking: "empty" };
    }

    return { summary: "ready", training: "ready", nutrition: "empty", tracking: "ready" };
  }, [client, clientForbidden, clientState]);

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
          <p className="muted">{clientForbidden ? t("trainer.clientContext.forbiddenHint") : t("trainer.clientContext.unavailable")}</p>
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

      setRemovingClient(false);
      setRemoveModalOpen(false);
      router.push("/app/trainer/clients");
      router.refresh();
    } catch {
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

  if (clientState === "loading") {
    return <LoadingState ariaLabel={t("trainer.clientContext.loading")} lines={3} />;
  }

  if (clientState === "error") {
    return <ErrorState title={t("trainer.clientContext.error")} retryLabel={t("trainer.retry")} onRetry={handleRetry} wrapInCard />;
  }

  if (!client) {
    return <EmptyState title={t("trainer.clientContext.empty")} wrapInCard icon="info" />;
  }

  return (
    <div className="form-stack">
      <header className="feature-card form-stack">
        <h2 style={{ margin: 0, overflowWrap: "anywhere" }}>{clientName}</h2>
        <p className="muted" style={{ margin: 0, overflowWrap: "anywhere" }}>
          {client.email}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge variant={client.isBlocked ? "danger" : "success"}>{statusText}</Badge>
          {client.subscriptionStatus ? <Badge variant="muted">{client.subscriptionStatus}</Badge> : null}
        </div>
      </header>

      <section className="card form-stack" aria-label={t("trainer.clientContext.summary.title")}>
        <h3 style={{ margin: 0 }}>{t("trainer.clientContext.summary.title")}</h3>
        <p className="muted" style={{ margin: 0 }}>
          {`${t("trainer.clientContext.summary.clientNamePrefix")} ${clientName}`}
        </p>
        <p className="muted" style={{ margin: 0 }}>
          {`${t("trainer.clientContext.summary.emailPrefix")} ${client.email ?? "-"}`}
        </p>
        <p className="muted" style={{ margin: 0 }}>
          {`${t("trainer.clientContext.summary.accountStatusPrefix")} ${statusText}`}
        </p>
        {client.lastLoginAt ? (
          <p className="muted" style={{ margin: 0 }}>
            {`${t("trainer.clientContext.tracking.lastLoginPrefix")} ${new Date(client.lastLoginAt).toLocaleDateString()}`}
          </p>
        ) : null}
      </section>

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
        <p className="muted" style={{ margin: 0 }}>
          {t("trainer.clientContext.removeClient.description")}
        </p>
        {!removeCapability.loading && !removeCapability.supported ? (
          <p className="muted" style={{ margin: 0 }}>
            {t("trainer.clientContext.removeClient.unsupported")}
          </p>
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
