"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  fetchMyGymMembership,
  fetchPendingGymJoinRequests,
  reviewGymJoinRequest,
  type GymMembership,
  type JoinRequestListItem,
} from "@/services/gym";

type Membership = Pick<GymMembership, "status" | "gymId">;

type JoinRequest = Pick<JoinRequestListItem, "id"> & { userName: string };

type GymMember = {
  id: string;
  name: string;
  role: string | null;
};

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function parseJoinRequests(items: JoinRequestListItem[]): JoinRequest[] {
  return items
    .map((item) => {
      const id = asString(item.id);
      if (!id) return null;

      return {
        id,
        userName: asString(item.userName) ?? asString(item.userEmail) ?? "-",
      };
    })
    .filter((row): row is JoinRequest => Boolean(row));
}

function parseMembers(payload: unknown): GymMember[] {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const rows = Array.isArray(source.data) ? source.data : Array.isArray(payload) ? payload : [];

  return rows
    .map((row) => {
      const item = typeof row === "object" && row !== null ? (row as Record<string, unknown>) : {};
      const id = asString(item.id) ?? asString(item.userId);
      const name = asString(item.name) ?? asString(item.userName) ?? asString(item.email) ?? "-";
      if (!id) return null;
      return { id, name, role: asString(item.role) };
    })
    .filter((row): row is GymMember => Boolean(row));
}

export default function GymAdminClient() {
  const { t } = useLanguage();
  const { isAdmin, isTrainer } = useAccess();
  const [membership, setMembership] = useState<Membership>({ status: "UNKNOWN", gymId: null });
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [members, setMembers] = useState<GymMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const authorized = useMemo(
    () => membership.status === "ACTIVE" && membership.gymId && (isAdmin || isTrainer),
    [membership.gymId, membership.status, isAdmin, isTrainer],
  );

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const membershipRes = await fetchMyGymMembership();
      if (!membershipRes.ok) throw new Error("membership");

      const nextMembership: Membership = { status: membershipRes.data.status, gymId: membershipRes.data.gymId };
      setMembership(nextMembership);

      if (nextMembership.status !== "ACTIVE" || !nextMembership.gymId || (!isAdmin && !isTrainer)) {
        setRequests([]);
        setMembers([]);
        return;
      }

      const [requestsRes, membersRes] = await Promise.all([
        fetchPendingGymJoinRequests(),
        fetch(`/api/admin/gyms/${nextMembership.gymId}/members`, { cache: "no-store", credentials: "include" }),
      ]);

      if (!requestsRes.ok || !membersRes.ok) throw new Error("data");

      setRequests(parseJoinRequests(requestsRes.data));
      setMembers(parseMembers(await membersRes.json()));
    } catch (_err) {
      setError(t("gym.adminLoadError"));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isTrainer, t]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const handleRequest = async (id: string, action: "accept" | "reject") => {
    setActionPending(`${id}:${action}`);
    try {
      const response = await reviewGymJoinRequest(id, action);
      if (!response.ok) throw new Error(action);
      await loadAdminData();
    } catch (_err) {
      setError(t("gym.adminActionError"));
    } finally {
      setActionPending(null);
    }
  };

  if (loading) {
    return (
      <section className="card">
        <Skeleton variant="line" className="w-45" />
        <Skeleton variant="line" className="w-70" />
        <Skeleton className="h-20 mt-3" />
      </section>
    );
  }

  if (!authorized) {
    return (
      <section className="card status-card status-card--warning">
        <strong>{t("gym.unauthorizedTitle")}</strong>
        <p className="muted">{t("gym.unauthorizedDescription")}</p>
      </section>
    );
  }

  return (
    <div className="page" style={{ gap: "0.75rem" }}>
      {error ? (
        <section className="card status-card status-card--warning">
          <strong>{t("gym.adminErrorTitle")}</strong>
          <p className="muted">{error}</p>
          <Button variant="secondary" onClick={() => void loadAdminData()}>{t("ui.retry")}</Button>
        </section>
      ) : null}

      <section className="card">
        <h2 className="section-title section-title-sm">{t("gym.pendingRequestsTitle")}</h2>
        <p className="section-subtitle">{t("gym.pendingRequestsSubtitle")}</p>
        {requests.length === 0 ? (
          <p className="muted">{t("gym.emptyRequests")}</p>
        ) : (
          <div className="form-stack">
            {requests.map((request) => (
              <div key={request.id} className="status-card" style={{ marginTop: "0.5rem" }}>
                <strong>{request.userName}</strong>
                <div className="inline-actions-sm" style={{ marginTop: "0.5rem" }}>
                  <Button
                    variant="secondary"
                    onClick={() => void handleRequest(request.id, "reject")}
                    disabled={actionPending === `${request.id}:reject` || Boolean(actionPending)}
                  >
                    {t("gym.reject")}
                  </Button>
                  <Button
                    onClick={() => void handleRequest(request.id, "accept")}
                    disabled={actionPending === `${request.id}:accept` || Boolean(actionPending)}
                  >
                    {t("gym.accept")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="section-title section-title-sm">{t("gym.membersTitle")}</h2>
        <p className="section-subtitle">{t("gym.membersSubtitle")}</p>
        {members.length === 0 ? (
          <p className="muted">{t("gym.emptyMembers")}</p>
        ) : (
          <div className="form-stack">
            {members.map((member) => (
              <div key={member.id} className="status-card" style={{ marginTop: "0.5rem" }}>
                <strong>{member.name}</strong>
                <p className="muted" style={{ margin: 0 }}>{member.role ?? t("ui.notAvailable")}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
