"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import {
  fetchPendingGymJoinRequests,
  reviewGymJoinRequest,
  type JoinRequestListItem,
} from "@/services/gym";

type JoinRequest = JoinRequestListItem;

export default function GymJoinRequestsManager() {
  const { t } = useLanguage();
  const { isAdmin, isDev, isLoading: accessLoading } = useAccess();

  const [loading, setLoading] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionsUnsupported, setActionsUnsupported] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    setActionError(null);
    setActionsUnsupported(false);
    try {
      const response = await fetchPendingGymJoinRequests();
      if (!response.ok && response.reason === "unsupported") {
        setUnsupported(true);
        setRequests([]);
        setLoading(false);
        return;
      }
      if (!response.ok) {
        setError(true);
        setLoading(false);
        return;
      }

      setUnsupported(false);
      setRequests(response.data);
      setLoading(false);
    } catch (_err) {
      setError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin && !isDev) return;
    void load();
  }, [isAdmin, isDev]);

  const act = async (id: string, action: "accept" | "reject") => {
    const confirmed = window.confirm(action === "accept" ? t("admin.gymRequestsConfirmAccept") : t("admin.gymRequestsConfirmReject"));
    if (!confirmed) return;

    setActingId(id);
    setError(false);
    setActionError(null);
    setActionsUnsupported(false);
    try {
      const response = await reviewGymJoinRequest(id, action);
      if (!response.ok && response.reason === "unsupported") {
        setActionsUnsupported(true);
        return;
      }

      if (!response.ok) {
        setActionError(t("admin.gymRequestsActionError"));
        return;
      }
      await load();
    } catch (_err) {
      setError(true);
    } finally {
      setActingId(null);
    }
  };

  if (accessLoading) return <LoadingState ariaLabel={t("admin.gymRequestsLoading")} title={t("admin.gymRequestsLoading")} lines={2} />;
  if (!isAdmin && !isDev) return <EmptyState title={t("admin.unauthorized")} wrapInCard icon="warning" />;

  if (loading) {
    return <LoadingState ariaLabel={t("admin.gymRequestsLoading")} title={t("admin.gymRequestsLoading")} lines={3} />;
  }

  if (unsupported) {
    return (
      <div className="status-card">
        <strong>{t("access.notAvailableTitle")}</strong>
        <p className="muted">{t("access.notAvailableDescription")}</p>
      </div>
    );
  }

  if (error) return <ErrorState title={t("admin.gymRequestsError")} retryLabel={t("admin.gymRequestsRetry")} onRetry={() => void load()} wrapInCard />;

  if (!requests.length) {
    return (
      <EmptyState
        title={t("admin.gymRequestsEmpty")}
        wrapInCard
        actions={[{ label: t("admin.gymRequestsRetry"), onClick: () => void load(), variant: "secondary" }]}
      />
    );
  }

  return (
    <div className="form-stack">
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={() => void load()} disabled={Boolean(actingId)}>{t("admin.gymRequestsRetry")}</Button>
      </div>
      {actionError ? <p className="muted">{actionError}</p> : null}
      {actionsUnsupported ? <p className="muted">{t("gym.admin.members.unavailable")}</p> : null}
      {requests.map((request) => (
        <div key={request.id} className="status-card">
          <strong>{request.userName ?? request.userEmail ?? request.id}</strong>
          <p className="muted" style={{ margin: 0 }}>
            {(request.userEmail ?? "-") + " · " + (request.gymName ?? "-")}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button disabled={actingId === request.id || actionsUnsupported} onClick={() => void act(request.id, "accept")}>{t("admin.gymRequestsAccept")}</Button>
            <Button variant="secondary" disabled={actingId === request.id || actionsUnsupported} onClick={() => void act(request.id, "reject")}>{t("admin.gymRequestsReject")}</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
