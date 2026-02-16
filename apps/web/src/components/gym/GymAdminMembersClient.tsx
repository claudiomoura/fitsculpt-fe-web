"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { AssignTrainingPlanModal } from "@/components/gym/AssignTrainingPlanModal";
import { useLanguage } from "@/context/LanguageProvider";
import { Button } from "@/components/ui/Button";
import {
  fetchGymJoinRequests,
  fetchGymMembers,
  fetchGymMembership,
  parseJoinRequests,
  parseMembers,
  parseMembership,
  reviewGymJoinRequest,
  type GymJoinRequest,
  type GymMember,
} from "@/services/gym";

type MembersState = "loading" | "ready";

export function GymAdminMembersClient() {
  const { t } = useLanguage();
  const [gymId, setGymId] = useState<string | null>(null);
  const [members, setMembers] = useState<GymMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<GymJoinRequest[]>([]);
  const [state, setState] = useState<MembersState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [requestsUnsupported, setRequestsUnsupported] = useState(false);
  const [membersUnsupported, setMembersUnsupported] = useState(false);
  const [selectedUser, setSelectedUser] = useState<GymMember | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestActionPending, setRequestActionPending] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setState("loading");
    setError(null);
    setSuccessMessage(null);
    setRequestsUnsupported(false);
    setMembersUnsupported(false);

    try {
      const membershipRes = await fetchGymMembership();
      if (!membershipRes.ok) {
        setError(t("gym.admin.members.profileError"));
        return;
      }

      const membership = parseMembership(await membershipRes.json());
      if (!membership.gymId) {
        setError(t("gym.admin.members.missingGymId"));
        return;
      }
      setGymId(membership.gymId);

      const [requestsRes, membersRes] = await Promise.all([
        fetchGymJoinRequests(),
        fetchGymMembers(membership.gymId),
      ]);

      if (requestsRes.status === 404 || requestsRes.status === 405) {
        setRequestsUnsupported(true);
        setJoinRequests([]);
      } else if (!requestsRes.ok) {
        setError(t("admin.gymRequestsError"));
        return;
      } else {
        setJoinRequests(parseJoinRequests(await requestsRes.json()));
      }

      if (membersRes.status === 404 || membersRes.status === 405) {
        setMembersUnsupported(true);
        setMembers([]);
      } else if (!membersRes.ok) {
        setError(t("gym.admin.members.loadError"));
        return;
      } else {
        setMembers(parseMembers(await membersRes.json()));
      }
    } catch {
      setError(t("gym.admin.members.loadError"));
    } finally {
      setState("ready");
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const hasMembers = useMemo(() => members.length > 0, [members]);
  const hasJoinRequests = useMemo(() => joinRequests.length > 0, [joinRequests]);

  const handleJoinRequestAction = useCallback(
    async (membershipId: string, action: "accept" | "reject") => {
      setRequestActionPending(`${membershipId}:${action}`);
      try {
        const response = await reviewGymJoinRequest(membershipId, action);
        if (!response.ok && response.reason === "unsupported") {
          setRequestsUnsupported(true);
          return;
        }
        if (!response.ok) {
          setError(t("admin.gymRequestsActionError"));
          return;
        }
        setSuccessMessage(t(action === "accept" ? "admin.gymRequestsAccept" : "admin.gymRequestsReject"));
        await loadData();
      } catch {
        setError(t("admin.gymRequestsActionError"));
      } finally {
        setRequestActionPending(null);
      }
    },
    [loadData, t],
  );

  return (
    <div className="form-stack">
      <section className="card">
        <h1 className="section-title">{t("gym.admin.members.title")}</h1>
        <p className="section-subtitle">{t("gym.admin.members.subtitle")}</p>
      </section>

      {successMessage ? <p className="muted">{successMessage}</p> : null}

      {state === "loading" ? <LoadingState ariaLabel={t("gym.admin.members.loading")} lines={3} /> : null}

      {state === "ready" && error ? (
        <ErrorState
          title={error}
          retryLabel={t("ui.retry")}
          onRetry={() => void loadData()}
          wrapInCard
        />
      ) : null}

      {state === "ready" && !error ? (
        <section className="card form-stack">
          <h2 className="section-title section-title-sm">{t("admin.gymRequestsTitle")}</h2>
          <p className="section-subtitle">{t("admin.gymRequestsSubtitle")}</p>
          {requestsUnsupported ? <p className="muted">{t("gym.admin.members.unavailable")}</p> : null}
          {!requestsUnsupported && !hasJoinRequests ? <p className="muted">{t("admin.gymRequestsEmpty")}</p> : null}
          {!requestsUnsupported && hasJoinRequests ? (
            <div className="form-stack">
              {joinRequests.map((request) => (
                <section key={request.id} className="feature-card" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <strong>{request.userName}</strong>
                    {request.email ? <p className="muted">{request.email}</p> : null}
                  </div>
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <Button
                      variant="secondary"
                      onClick={() => void handleJoinRequestAction(request.id, "reject")}
                      disabled={Boolean(requestActionPending)}
                    >
                      {t("admin.gymRequestsReject")}
                    </Button>
                    <Button onClick={() => void handleJoinRequestAction(request.id, "accept")} disabled={Boolean(requestActionPending)}>
                      {t("admin.gymRequestsAccept")}
                    </Button>
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {state === "ready" && !error && membersUnsupported ? (
        <EmptyState
          title={t("gym.admin.members.title")}
          description={t("gym.admin.members.unavailable")}
          wrapInCard
          actions={[{ label: t("ui.retry"), onClick: () => void loadData(), variant: "secondary" }]}
        />
      ) : null}

      {state === "ready" && !error && !membersUnsupported && !hasMembers ? (
        <EmptyState title={t("gym.admin.members.empty")} wrapInCard icon="info" />
      ) : null}

      {state === "ready" && !error && !membersUnsupported && hasMembers
        ? members.map((user) => (
            <section key={user.id} className="feature-card" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <strong>{user.name || user.email || "-"}</strong>
                {user.email ? <p className="muted">{user.email}</p> : null}
              </div>
              <Button onClick={() => setSelectedUser(user)}>{t("gym.admin.members.assignAction")}</Button>
            </section>
          ))
        : null}

      {gymId && selectedUser ? (
        <AssignTrainingPlanModal
          open
          gymId={gymId}
          userId={selectedUser.id}
          userLabel={selectedUser.name || selectedUser.email || "-"}
          onClose={() => setSelectedUser(null)}
          onAssigned={() => setSuccessMessage(t("gym.admin.members.assignSuccess"))}
        />
      ) : null}
    </div>
  );
}
