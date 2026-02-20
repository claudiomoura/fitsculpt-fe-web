"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import {
  ClientHeaderCardSkeleton,
  ClientProfileSummarySkeleton,
  ClientRecentActivityCardSkeleton,
  NotesPanelSkeleton,
} from "@/components/trainer-client/TrainerClientSkeletons";
import { useLanguage } from "@/context/LanguageProvider";
import { useToast } from "@/components/ui/Toast";
import { getRoleFlags } from "@/lib/roles";
import TrainerMemberPlanAssignmentCard from "@/components/trainer/TrainerMemberPlanAssignmentCard";
import { fetchMyGymMembership } from "@/services/gym";
import {
  getTrainerClientDetail,
  removeTrainerClientRelationship,
  trainerClientServiceCapabilities,
  type TrainerClientDetail,
} from "@/services/trainer/clients";

type AuthUser = Record<string, unknown>;
type LoadState = "loading" | "ready" | "error";
type MembershipState = "in_gym" | "not_in_gym" | "unknown";

type TrainerNote = {
  id: string;
  content: string;
  createdAt: string | null;
};

type NotesCapability = "checking" | "supported" | "unsupported" | "forbidden" | "error";
type TrainerClientTab = "summary" | "progress" | "plan" | "notes";

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function canAccessTrainerGymArea(input: { isAdmin: boolean; isCoach: boolean; membership: { state: "in_gym" | "not_in_gym"; gymId: string | null; gymName: string | null } }): boolean {
  return (input.isAdmin || input.isCoach) && input.membership.state === "in_gym";
}

function parseNotes(payload: unknown): TrainerNote[] {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const list = Array.isArray(source.items)
    ? source.items
    : Array.isArray(source.notes)
      ? source.notes
      : [];

  return list
    .map((item) => {
      const row = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
      const id = asString(row.id);
      const content = asString(row.content) ?? asString(row.note);
      if (!id || !content) return null;
      return {
        id,
        content,
        createdAt: asString(row.createdAt),
      };
    })
    .filter((note): note is TrainerNote => Boolean(note));
}

export default function TrainerClientContextClient() {
  const { t } = useLanguage();
  const { notify } = useToast();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clientId = params.id;

  const [permissionState, setPermissionState] = useState<LoadState>("loading");
  const [clientState, setClientState] = useState<LoadState>("loading");
  const [canAccessTrainer, setCanAccessTrainer] = useState(false);
  const [membershipState, setMembershipState] = useState<MembershipState>("unknown");
  const [clientForbidden, setClientForbidden] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [removingClient, setRemovingClient] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeClientDisabled, setRemoveClientDisabled] = useState(false);
  const removeClientSupported = trainerClientServiceCapabilities.canRemoveClient && !removeClientDisabled;

  const [client, setClient] = useState<TrainerClientDetail | null>(null);
  const [notes, setNotes] = useState<TrainerNote[]>([]);
  const [notesCapability, setNotesCapability] = useState<NotesCapability>("checking");
  const [notesNotSupported, setNotesNotSupported] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSubmitting, setNotesSubmitting] = useState(false);
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TrainerClientTab>("summary");

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  const loadNotes = useCallback(async () => {
    if (!clientId || notesNotSupported) return;

    setNotesLoading(true);
    setNoteFeedback(null);
    try {
      const response = await fetch(`/api/trainer/clients/${clientId}/notes`, { cache: "no-store", credentials: "include" });

      if (response.status === 404 || response.status === 405) {
        setNotesNotSupported(true);
        setNotesCapability("unsupported");
        setNotes([]);
        setNotesLoading(false);
        return;
      }
      if (response.status === 403) {
        setNotesCapability("forbidden");
        setNotes([]);
        setNotesLoading(false);
        return;
      }
      if (!response.ok) {
        setNotesCapability("error");
        setNotes([]);
        setNotesLoading(false);
        return;
      }

      setNotesCapability("supported");
      const payload = (await response.json()) as unknown;
      setNotes(parseNotes(payload));
      setNotesLoading(false);
    } catch {
      setNotesCapability("error");
      setNotes([]);
      setNotesLoading(false);
    }
  }, [clientId, notesNotSupported]);


  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [meResponse, membershipResult] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetchMyGymMembership(),
        ]);

        if (!meResponse.ok || !membershipResult.ok) {
          if (active) setPermissionState("error");
          return;
        }

        const meData = (await meResponse.json()) as AuthUser;
        const roleFlags = getRoleFlags(meData);
        const gymMembership: { state: "in_gym" | "not_in_gym"; gymId: string | null; gymName: string | null } = {
          state: membershipResult.data.status === "ACTIVE" ? "in_gym" : "not_in_gym",
          gymId: membershipResult.data.gymId,
          gymName: membershipResult.data.gymName,
        };

        if (!active) return;

        setMembershipState(gymMembership.state);

        const canAccess = canAccessTrainerGymArea({ isAdmin: roleFlags.isAdmin, isCoach: roleFlags.isTrainer, membership: gymMembership });
        setCanAccessTrainer(canAccess);
        setPermissionState("ready");

        if (!canAccess) return;

        setClientState("loading");
        setClientForbidden(false);
        const detailResult = await getTrainerClientDetail(clientId);
        if (!active) return;

        if (!detailResult.ok) {
          if (detailResult.status === 403) {
            setClientForbidden(true);
            setClientState("ready");
            return;
          }
          if (detailResult.status === 404) {
            setClient(null);
            setClientState("ready");
            return;
          }
          setClientState("error");
          return;
        }

        setClient(detailResult.data);
        setClientState("ready");
        setNotesNotSupported(false);
        setNotesCapability("checking");
        setNotes([]);
        await loadNotes();
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
  }, [clientId, loadNotes]);

  const clientName = useMemo(() => {
    if (!client) return t("trainer.clientContext.unknownClient");
    return client.name?.trim() || client.email || t("trainer.clientContext.unknownClient");
  }, [client, t]);

  const initials = useMemo(() => {
    return clientName
      .split(" ")
      .map((chunk) => chunk.trim().charAt(0).toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join("") || "?";
  }, [clientName]);

  const nextReviewDate = useMemo(() => {
    if (!client || typeof client !== "object") return null;
    const source = client as Record<string, unknown>;
    return asString(source.nextReviewDate) ?? asString(source.nextReviewAt);
  }, [client]);

  const avatarUrl = useMemo(() => {
    if (!client) return null;
    const row = client.raw;
    return (
      asString(row.avatarUrl) ??
      asString(row.profilePhotoUrl) ??
      asString(row.avatarDataUrl) ??
      asString(row.profileImageUrl)
    );
  }, [client]);



  const trackingEntries = useMemo(() => {
    if (!client) return [] as Array<{ key: string; value: string }>;

    const tracking =
      typeof client.raw.tracking === "object" && client.raw.tracking !== null
        ? (client.raw.tracking as Record<string, unknown>)
        : null;

    if (!tracking) return [] as Array<{ key: string; value: string }>;

    return Object.entries(tracking)
      .map(([key, value]) => {
        const normalizedValue = asString(value);
        if (!normalizedValue) return null;
        return { key, value: normalizedValue };
      })
      .filter((entry): entry is { key: string; value: string } => Boolean(entry));
  }, [client]);

  const hasPlanData = useMemo(() => {
    if (!client) return false;

    if (Array.isArray(client.plans)) return client.plans.length > 0;

    return typeof client.plans === "object" && client.plans !== null && Object.keys(client.plans as Record<string, unknown>).length > 0;
  }, [client]);

  const removeClientRelation = useCallback(async () => {
    if (!client || !canAccessTrainer) return;

    setRemovingClient(true);
    setRemoveError(null);

    const result = await removeTrainerClientRelationship(client.id);
    setRemovingClient(false);

    if (!result.ok) {
      if (result.status === 403) {
        const message = t("trainer.clientContext.removeClient.forbidden");
        notify({ title: t("common.error"), description: message, variant: "error" });
        setRemoveError(message);
        setRemoveClientDisabled(true);
        return;
      }

      if (result.status === 404 || result.status === 405) {
        const message = t("trainer.clientContext.removeClient.unavailable");
        notify({ title: t("common.error"), description: message, variant: "error" });
        setRemoveError(message);
        setRemoveClientDisabled(true);
        return;
      }

      notify({
        title: t("common.error"),
        description: t("trainer.clientContext.removeClient.submitError"),
        variant: "error",
      });
      setRemoveError(t("trainer.clientContext.removeClient.submitError"));
      return;
    }

    notify({
      title: t("common.success"),
      description: t("trainer.clientContext.removeClient.success").replace("{member}", clientName),
      variant: "success",
    });
    setRemoveModalOpen(false);
    router.push("/app/trainer/clients");
    router.refresh();
  }, [canAccessTrainer, client, clientName, notify, router, t]);

  const onCreateNote = useCallback(async () => {
    const content = noteInput.trim();
    if (!content || notesCapability !== "supported") return;

    setNotesSubmitting(true);
    setNoteFeedback(null);

    try {
      const response = await fetch(`/api/trainer/clients/${clientId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({ content }),
      });

      setNotesSubmitting(false);

      if (response.status === 404 || response.status === 405) {
        setNotesNotSupported(true);
        setNotesCapability("unsupported");
        return;
      }

      if (!response.ok) {
        setNoteFeedback(t("trainer.clientContext.notes.submitError"));
        return;
      }

      setNoteInput("");
      setNoteFeedback(t("trainer.clientContext.notes.submitSuccess"));
      await loadNotes();
    } catch {
      setNotesSubmitting(false);
      setNoteFeedback(t("trainer.clientContext.notes.submitError"));
    }
  }, [clientId, loadNotes, noteInput, notesCapability, t]);

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
    return (
      <div className="form-stack" aria-label={t("trainer.clientContext.loading")}>
        <ClientHeaderCardSkeleton />
        <div className="card form-stack">
          <LoadingState ariaLabel={t("trainer.clientContext.loading")} lines={1} />
        </div>
        <ClientProfileSummarySkeleton />
        <ClientRecentActivityCardSkeleton />
        <NotesPanelSkeleton />
      </div>
    );
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

  const statusText = client.isBlocked === true ? t("trainer.clients.blocked") : t("trainer.clients.active");

  const tabs: Array<{ id: TrainerClientTab; label: string }> = [
    { id: "summary", label: t("trainer.clientContext.tabs.summary") },
    { id: "progress", label: t("trainer.clientContext.tabs.progress") },
    { id: "plan", label: t("trainer.clientContext.tabs.plan") },
    { id: "notes", label: t("trainer.clientContext.tabs.notes") },
  ];

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
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={t("trainer.clients.avatarAlt").replace("{name}", clientName)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials
          )}
        </span>

        <div className="form-stack" style={{ gap: 2, minWidth: 0 }}>
          <h2 style={{ margin: 0, overflowWrap: "anywhere" }}>{clientName}</h2>
          {client.email ? <p className="muted" style={{ margin: 0, overflowWrap: "anywhere" }}>{client.email}</p> : null}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge variant={client.isBlocked === true ? "danger" : "success"}>{statusText}</Badge>
            {client.subscriptionStatus ? <Badge variant="muted">{client.subscriptionStatus}</Badge> : null}
          </div>
          {nextReviewDate ? (
            <p className="muted" style={{ margin: 0 }}>
              {`${t("trainer.clientContext.nextReviewDate")}: ${new Date(nextReviewDate).toLocaleDateString()}`}
            </p>
          ) : null}
        </div>
      </header>

      <nav aria-label={t("trainer.clientContext.tabs.ariaLabel")}>
        <div role="tablist" aria-orientation="horizontal" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`trainer-client-tabpanel-${tab.id}`}
              id={`trainer-client-tab-${tab.id}`}
              className={`btn ${activeTab === tab.id ? "" : "secondary"}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {activeTab === "summary" ? (
        <section id="trainer-client-tabpanel-summary" role="tabpanel" aria-labelledby="trainer-client-tab-summary" className="card form-stack">
          <h3 style={{ margin: 0 }}>{t("trainer.clientContext.summary.title")}</h3>
          <div className="form-stack" style={{ gap: 6 }}>
            <p style={{ margin: 0 }}><strong>{t("trainer.clientContext.summary.nameLabel")}:</strong> {clientName}</p>
            <p style={{ margin: 0 }}><strong>{t("trainer.clientContext.summary.emailLabel")}:</strong> {client.email ?? t("trainer.clientContext.summary.emailEmpty")}</p>
            <p style={{ margin: 0 }}><strong>{t("trainer.clientContext.summary.statusLabel")}:</strong> {statusText}</p>
            <p style={{ margin: 0 }}><strong>{t("trainer.clientContext.summary.lastActivityLabel")}:</strong> {client.lastLoginAt ? new Date(client.lastLoginAt).toLocaleString() : t("trainer.clientContext.summary.lastActivityEmpty")}</p>
          </div>
        </section>
      ) : null}

      {activeTab === "progress" ? (
        <section id="trainer-client-tabpanel-progress" role="tabpanel" aria-labelledby="trainer-client-tab-progress" className="card form-stack">
          <h3 style={{ margin: 0 }}>{t("trainer.clientContext.progress.title")}</h3>
          {trackingEntries.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>{t("trainer.clientContext.progress.empty")}</p>
          ) : (
            <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 20 }}>
              {trackingEntries.map((entry) => (
                <li key={entry.key}><span style={{ fontWeight: 600 }}>{entry.key}:</span> {entry.value}</li>
              ))}
            </ul>
          )}
          {client.lastLoginAt ? <p className="muted" style={{ margin: 0 }}>{`${t("trainer.clientContext.progress.lastLoginAt")}: ${new Date(client.lastLoginAt).toLocaleString()}`}</p> : null}
        </section>
      ) : null}

      {activeTab === "plan" ? (
        <section id="trainer-client-tabpanel-plan" role="tabpanel" aria-labelledby="trainer-client-tab-plan" className="form-stack">
          <section className="card form-stack" aria-label={t("trainer.clientContext.training.title")}>
            <h3 style={{ margin: 0 }}>{t("trainer.clientContext.training.title")}</h3>
            <p className="muted" style={{ margin: 0 }}>
              {`${t("trainer.clientContext.training.subscriptionStatusPrefix")} ${client.subscriptionStatus ?? "-"}`}
            </p>
            {!hasPlanData ? <p className="muted" style={{ margin: 0 }}>{t("trainer.clientContext.training.empty")}</p> : null}
            <TrainerMemberPlanAssignmentCard memberId={client.id} memberName={clientName} />
          </section>

          <section className="card form-stack" aria-label={t("trainer.clientContext.removeClient.title")}>
            <h3 style={{ margin: 0 }}>{t("trainer.clientContext.removeClient.title")}</h3>
            <p className="muted" style={{ margin: 0 }}>{t("trainer.clientContext.removeClient.description")}</p>
            {!canAccessTrainer || !removeClientSupported ? <p className="muted" style={{ margin: 0 }}>{t("trainer.clientContext.removeClient.unsupported")}</p> : null}
            <button
              type="button"
              className="btn danger"
              style={{ width: "fit-content" }}
              disabled={!canAccessTrainer || !removeClientSupported}
              onClick={() => {
                setRemoveError(null);
                setRemoveModalOpen(true);
              }}
            >
              {t("trainer.clientContext.removeClient.openConfirm")}
            </button>
          </section>
        </section>
      ) : null}

      {activeTab === "notes" ? (
        <section id="trainer-client-tabpanel-notes" role="tabpanel" aria-labelledby="trainer-client-tab-notes" className="card form-stack" aria-live="polite" aria-label={t("trainer.clientContext.notes.title")}>
          <h3 style={{ margin: 0 }}>{t("trainer.clientContext.notes.title")}</h3>

          {notesLoading || notesCapability === "checking" ? <p className="muted">{t("trainer.clientContext.notes.loading")}</p> : null}
          {!notesLoading && notesCapability === "unsupported" ? <p className="muted">{t("trainer.client.notesNotAvailable")}</p> : null}
          {!notesLoading && notesCapability === "forbidden" ? <p className="muted">{t("trainer.clientContext.notes.forbidden")}</p> : null}
          {!notesLoading && notesCapability === "error" ? <p className="muted">{t("trainer.clientContext.notes.loadError")}</p> : null}

          {!notesLoading && notesCapability === "supported" ? (
            <>
              {notes.length === 0 ? <p className="muted">{t("trainer.clientContext.notes.empty")}</p> : null}
              {notes.length > 0 ? (
                <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 20 }}>
                  {notes.map((note) => (
                    <li key={note.id}>
                      <p style={{ margin: 0 }}>{note.content}</p>
                      {note.createdAt ? <p className="muted" style={{ margin: "4px 0 0" }}>{new Date(note.createdAt).toLocaleString()}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              <label htmlFor="trainer-note-create" className="sr-only">{t("trainer.clientContext.notes.inputLabel")}</label>
              <textarea
                id="trainer-note-create"
                className="input"
                rows={4}
                value={noteInput}
                onChange={(event) => setNoteInput(event.target.value)}
                placeholder={t("trainer.clientContext.notes.inputPlaceholder")}
              />
              <button
                type="button"
                className="btn"
                style={{ width: "fit-content" }}
                onClick={() => void onCreateNote()}
                disabled={notesSubmitting || noteInput.trim().length === 0}
              >
                {notesSubmitting ? t("trainer.clientContext.notes.submitting") : t("trainer.clientContext.notes.submit")}
              </button>
            </>
          ) : null}

          {noteFeedback ? <p className="muted">{noteFeedback}</p> : null}
        </section>
      ) : null}

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
              disabled={!canAccessTrainer || !removeClientSupported || removingClient}
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
          {!canAccessTrainer || !removeClientSupported ? (
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
