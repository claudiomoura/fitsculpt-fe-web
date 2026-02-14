"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";

type JoinRequestRecord = {
  id: string;
  status: string;
};

type RequestsResponse = {
  items?: unknown;
  requests?: unknown;
};

type FeatureState = "loading" | "unsupported" | "ready" | "error";

function readRequestId(source: Record<string, unknown>): string | null {
  const raw = source.id;
  return typeof raw === "string" && raw.trim().length > 0 ? raw : null;
}

function readRequestStatus(source: Record<string, unknown>): string {
  const raw = source.status;
  return typeof raw === "string" && raw.trim().length > 0 ? raw : "pending";
}

function normalizeRequests(payload: RequestsResponse): JoinRequestRecord[] {
  const candidate = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.requests) ? payload.requests : [];

  return candidate
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const id = readRequestId(record);
      if (!id) return null;

      return {
        id,
        status: readRequestStatus(record),
      };
    })
    .filter((entry): entry is JoinRequestRecord => Boolean(entry));
}

export default function GymJoinRequestsManager() {
  const { t } = useLanguage();
  const { isAdmin, isDev, isLoading: accessLoading } = useAccess();
  const [featureState, setFeatureState] = useState<FeatureState>("loading");
  const [items, setItems] = useState<JoinRequestRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canPreviewUnsupported = isAdmin || isDev;

  const loadRequests = useCallback(async () => {
    setFeatureState("loading");
    try {
      const response = await fetch("/api/admin/gym-join-requests", { cache: "no-store" });

      if (response.status === 404 || response.status === 405) {
        setFeatureState("unsupported");
        setItems([]);
        return;
      }

      if (!response.ok) {
        setFeatureState("error");
        return;
      }

      const payload = (await response.json()) as RequestsResponse;
      setItems(normalizeRequests(payload));
      setFeatureState("ready");
    } catch {
      setFeatureState("error");
    }
  }, []);

  useEffect(() => {
    if (accessLoading) return;
    if (!canPreviewUnsupported) return;
    void loadRequests();
  }, [accessLoading, canPreviewUnsupported, loadRequests]);

  const pendingItems = useMemo(() => items.filter((item) => item.status.toLowerCase() === "pending"), [items]);

  const handleAction = useCallback(
    async (id: string, action: "accept" | "reject") => {
      setBusyId(id);
      try {
        const response = await fetch(`/api/admin/gym-join-requests/${id}/${action}`, { method: "POST" });
        if (!response.ok) {
          setFeatureState("error");
          return;
        }

        const result = (await response.json()) as { id?: string; status?: string };
        if (!result.id || !result.status) {
          setFeatureState("error");
          return;
        }

        setItems((current) =>
          current.map((item) => (item.id === result.id ? { ...item, status: result.status ?? item.status } : item)),
        );
      } catch {
        setFeatureState("error");
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  if (accessLoading || featureState === "loading") {
    return <p className="muted">{t("admin.gymRequestsLoading")}</p>;
  }

  if (!canPreviewUnsupported) {
    return <p className="muted">{t("admin.unauthorized")}</p>;
  }

  if (featureState === "unsupported") {
    return <p className="muted">{t("admin.gymRequestsRequiresImplementation")}</p>;
  }

  if (featureState === "error") {
    return (
      <div className="form-stack">
        <p className="muted">{t("admin.gymRequestsError")}</p>
        <div>
          <button type="button" className="btn secondary" onClick={() => void loadRequests()}>
            {t("admin.gymRequestsRetry")}
          </button>
        </div>
      </div>
    );
  }

  if (pendingItems.length === 0) {
    return (
      <div className="form-stack">
        <p className="muted">{t("admin.gymRequestsEmpty")}</p>
        <div>
          <button type="button" className="btn secondary" onClick={() => void loadRequests()}>
            {t("admin.gymRequestsRetry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ul className="form-stack" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {pendingItems.map((item) => (
        <li key={item.id} className="feature-card" style={{ display: "grid", gap: 8 }}>
          <div>
            <strong>{item.id}</strong>
            <p className="muted" style={{ margin: 0 }}>{item.status}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn"
              disabled={busyId === item.id}
              onClick={() => void handleAction(item.id, "accept")}
            >
              {t("admin.gymRequestsAccept")}
            </button>
            <button
              type="button"
              className="btn secondary"
              disabled={busyId === item.id}
              onClick={() => void handleAction(item.id, "reject")}
            >
              {t("admin.gymRequestsReject")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
