"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { fetchPendingGymJoinRequests, reviewGymJoinRequest, type JoinRequestListItem } from "@/services/gym";
import TrainerAdminNoGymPanel from "./TrainerAdminNoGymPanel";
import { useTrainerAreaAccess } from "./useTrainerAreaAccess";

type ListState = "loading" | "ready";

export default function TrainerRequestsClient() {
  const { t } = useLanguage();
  const { isLoading: accessLoading, gymLoading, gymError, membership, canAccessTrainerArea, canAccessAdminNoGymPanel } = useTrainerAreaAccess();
  const [state, setState] = useState<ListState>("loading");
  const [items, setItems] = useState<JoinRequestListItem[]>([]);
  const [error, setError] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setState("loading");
    setError(false);

    const response = await fetchPendingGymJoinRequests();
    if (!response.ok) {
      setError(true);
      setState("ready");
      return;
    }

    setItems(response.data);
    setState("ready");
  }, []);

  useEffect(() => {
    if (!canAccessTrainerArea) return;

    const timeoutId = window.setTimeout(() => {
      void loadRequests();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [canAccessTrainerArea, loadRequests]);

  const onReview = async (requestId: string, action: "accept" | "reject") => {
    setPendingAction(`${requestId}:${action}`);
    const response = await reviewGymJoinRequest(requestId, action);
    setPendingAction(null);
    if (!response.ok) {
      setError(true);
      return;
    }

    await loadRequests();
  };

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

    if (gymError) {
      return <ErrorState title={t("trainer.error")} retryLabel={t("ui.retry")} onRetry={() => window.location.reload()} wrapInCard />;
    }

    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  if (state === "loading") {
    return <LoadingState ariaLabel={t("trainer.requests.loading")} lines={3} />;
  }

  if (error) {
    return <ErrorState title={t("trainer.requests.error")} retryLabel={t("ui.retry")} onRetry={() => void loadRequests()} wrapInCard />;
  }

  if (items.length === 0) {
    return <EmptyState title={t("trainer.requests.empty")} wrapInCard icon="info" />;
  }

  return (
    <section className="form-stack" aria-label={t("trainer.requests.title")}>
      {items.map((item) => {
        const acceptKey = `${item.id}:accept`;
        const rejectKey = `${item.id}:reject`;
        const busy = pendingAction === acceptKey || pendingAction === rejectKey;
        return (
          <article key={item.id} className="card form-stack">
            <div>
              <strong>{item.userName ?? t("ui.notAvailable")}</strong>
              {item.userEmail ? <p className="muted" style={{ margin: "4px 0 0" }}>{item.userEmail}</p> : null}
              {item.gymName ? <p className="muted" style={{ margin: "4px 0 0" }}>{item.gymName}</p> : null}
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button className="btn secondary" type="button" onClick={() => void onReview(item.id, "reject")} disabled={Boolean(pendingAction)}>
                {busy && pendingAction === rejectKey ? t("trainer.requests.rejecting") : t("trainer.requests.reject")}
              </button>
              <button className="btn" type="button" onClick={() => void onReview(item.id, "accept")} disabled={Boolean(pendingAction)}>
                {busy && pendingAction === acceptKey ? t("trainer.requests.accepting") : t("trainer.requests.accept")}
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
