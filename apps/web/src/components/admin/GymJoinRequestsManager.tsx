"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";
import { Button } from "@/components/ui/Button";

type JoinRequest = {
  id: string;
  gymId?: string;
  gymName?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  createdAt?: string;
};

function readRequests(payload: unknown): JoinRequest[] {
  if (!payload || typeof payload !== "object") return [];
  const source = payload as Record<string, unknown>;
  const items = Array.isArray(source.items)
    ? source.items
    : Array.isArray(source.requests)
      ? source.requests
      : Array.isArray(source.data)
        ? source.data
        : Array.isArray(payload)
          ? payload
          : [];

  const parsed: JoinRequest[] = [];

  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const gym = (row.gym as Record<string, unknown> | undefined) ?? undefined;
    const user = (row.user as Record<string, unknown> | undefined) ?? undefined;
    const id = String(row.id ?? "").trim();
    if (!id) continue;

    parsed.push({
      id,
      gymId: String(row.gymId ?? gym?.id ?? "").trim() || undefined,
      gymName: String(row.gymName ?? gym?.name ?? "").trim() || undefined,
      userId: String(row.userId ?? user?.id ?? "").trim() || undefined,
      userName: String(row.userName ?? user?.name ?? "").trim() || undefined,
      userEmail: String(row.userEmail ?? user?.email ?? "").trim() || undefined,
      createdAt: String(row.createdAt ?? "").trim() || undefined,
    });
  }

  return parsed;
}

export default function GymJoinRequestsManager() {
  const { t } = useLanguage();
  const { isAdmin, isDev, isLoading: accessLoading } = useAccess();

  const [loading, setLoading] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState(false);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/admin/gym-join-requests", { cache: "no-store", credentials: "include" });
      if (response.status === 404 || response.status === 405) {
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

      const payload = (await response.json()) as unknown;
      setUnsupported(false);
      setRequests(readRequests(payload));
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin && !isDev) return;
    void load();
  }, [isAdmin, isDev]);

  const act = async (id: string, action: "accept" | "reject") => {
    setActingId(id);
    setError(false);
    try {
      const response = await fetch(`/api/admin/gym-join-requests/${id}/${action}`, {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) {
        setError(true);
        setActingId(null);
        return;
      }
      await load();
    } catch {
      setError(true);
    } finally {
      setActingId(null);
    }
  };

  if (accessLoading) return <p className="muted">{t("admin.gymRequestsLoading")}</p>;
  if (!isAdmin && !isDev) return <p className="muted">{t("admin.unauthorized")}</p>;

  if (loading) return <p className="muted">{t("admin.gymRequestsLoading")}</p>;

  if (unsupported) {
    return (
      <div className="status-card">
        <strong>{t("access.notAvailableTitle")}</strong>
        <p className="muted">{t("access.notAvailableDescription")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="form-stack">
        <p className="muted">{t("admin.gymRequestsError")}</p>
        <Button variant="secondary" onClick={() => void load()}>{t("admin.gymRequestsRetry")}</Button>
      </div>
    );
  }

  if (!requests.length) return <p className="muted">{t("admin.gymRequestsEmpty")}</p>;

  return (
    <div className="form-stack">
      {requests.map((request) => (
        <div key={request.id} className="status-card">
          <strong>{request.userName ?? request.userEmail ?? request.id}</strong>
          <p className="muted" style={{ margin: 0 }}>
            {(request.userEmail ?? "-") + " · " + (request.gymName ?? "-")}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button disabled={actingId === request.id} onClick={() => void act(request.id, "accept")}>{t("admin.gymRequestsAccept")}</Button>
            <Button variant="secondary" disabled={actingId === request.id} onClick={() => void act(request.id, "reject")}>{t("admin.gymRequestsReject")}</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
