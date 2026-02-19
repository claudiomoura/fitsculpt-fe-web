"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { AssignTrainingPlanModal } from "@/components/gym/AssignTrainingPlanModal";
import { useLanguage } from "@/context/LanguageProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  fetchGymJoinRequests,
  fetchGymMembers,
  fetchGymMembership,
  parseJoinRequests,
  parseMembers,
  parseMembership,
  reviewGymJoinRequest,
  updateGymMemberRole,
  gymServiceCapabilities,
  type GymJoinRequest,
  type GymMember,
} from "@/services/gym";

type MembersState = "loading" | "ready";

type RoleUpdateTarget = "TRAINER" | "MEMBER";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "ADMIN",
  TRAINER: "TRAINER",
  MEMBER: "MEMBER",
};

function emitGymMembershipRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("gym-membership:refresh"));
  window.dispatchEvent(new Event("auth:refresh"));
}

export function GymAdminMembersClient() {
  const { t } = useLanguage();
  const [gymId, setGymId] = useState<string | null>(null);
  const [membershipRole, setMembershipRole] = useState<string | null>(null);
  const [members, setMembers] = useState<GymMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<GymJoinRequest[]>([]);
  const [state, setState] = useState<MembersState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [requestsUnsupported, setRequestsUnsupported] = useState(false);
  const [membersUnsupported, setMembersUnsupported] = useState(false);
  const [roleUpdateUnsupported, setRoleUpdateUnsupported] = useState(false);
  const [selectedUser, setSelectedUser] = useState<GymMember | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestActionPending, setRequestActionPending] = useState<string | null>(null);
  const [roleActionPendingUserId, setRoleActionPendingUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setState("loading");
    setError(null);
    setSuccessMessage(null);
    setRequestsUnsupported(false);
    setMembersUnsupported(false);
    setRoleUpdateUnsupported(false);

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
      setMembershipRole(membership.role);

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
    } catch (_err) {
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
  const canManageMemberRole = membershipRole === "ADMIN";

  const getRoleLabel = useCallback((role: string | null | undefined) => {
    const normalizedRole = role?.toUpperCase() ?? "MEMBER";
    return ROLE_LABELS[normalizedRole] ?? normalizedRole;
  }, []);

  const getRoleVariant = useCallback((role: string | null | undefined) => {
    const normalizedRole = role?.toUpperCase();
    if (normalizedRole === "ADMIN") return "warning" as const;
    if (normalizedRole === "TRAINER") return "success" as const;
    return "muted" as const;
  }, []);

  const handleRoleChange = useCallback(
    async (user: GymMember, role: RoleUpdateTarget) => {
      if (!gymServiceCapabilities.supportsMemberRoleUpdate) {
        setRoleUpdateUnsupported(true);
        return;
      }

      setError(null);
      setRoleActionPendingUserId(user.id);
      setRoleUpdateUnsupported(false);
      try {
        const response = await updateGymMemberRole(user.id, role);
        if (!response.ok && response.reason === "unsupported") {
          setRoleUpdateUnsupported(true);
          return;
        }
        if (!response.ok) {
          setError(t("gym.admin.members.roleChangeError"));
          return;
        }

        setSuccessMessage(
          t(role === "TRAINER" ? "gym.admin.members.promoteSuccess" : "gym.admin.members.demoteSuccess"),
        );
        await loadData();
      } catch (_err) {
        setError(t("gym.admin.members.roleChangeError"));
      } finally {
        setRoleActionPendingUserId(null);
      }
    },
    [loadData, t],
  );

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
        emitGymMembershipRefresh();
      } catch (_err) {
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

      {state === "ready" && !error && !membersUnsupported && roleUpdateUnsupported ? (
        <p className="muted">{t("adminGyms.memberRoleUnavailable")}</p>
      ) : null}

      {state === "ready" && !error && !membersUnsupported && hasMembers
        ? members.map((user) => {
            const userRole = user.role?.toUpperCase() ?? "MEMBER";
            const userRoleLabel = getRoleLabel(userRole);
            const isRoleActionPending = roleActionPendingUserId === user.id;
            const shouldShowPromote = userRole === "MEMBER";
            const shouldShowDemote = userRole === "TRAINER";

            return (
              <section key={user.id} className="feature-card" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>{user.name || user.email || "-"}</strong>
                  {user.email ? <p className="muted">{user.email}</p> : null}
                  <p style={{ margin: "8px 0 0" }}>
                    <Badge variant={getRoleVariant(userRole)}>{userRoleLabel}</Badge>
                  </p>
                </div>
                <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
                  {canManageMemberRole && shouldShowPromote ? (
                    <Button onClick={() => void handleRoleChange(user, "TRAINER")} disabled={isRoleActionPending || roleUpdateUnsupported || !gymServiceCapabilities.supportsMemberRoleUpdate}>
                      {isRoleActionPending ? t("gym.admin.members.roleChanging") : t("gym.admin.members.promoteTrainer")}
                    </Button>
                  ) : null}
                  {canManageMemberRole && shouldShowDemote ? (
                    <Button variant="secondary" onClick={() => void handleRoleChange(user, "MEMBER")} disabled={isRoleActionPending || roleUpdateUnsupported || !gymServiceCapabilities.supportsMemberRoleUpdate}>
                      {isRoleActionPending ? t("gym.admin.members.roleChanging") : t("gym.admin.members.removeTrainer")}
                    </Button>
                  ) : null}
                  <Button onClick={() => setSelectedUser(user)}>{t("gym.admin.members.assignAction")}</Button>
                </div>
              </section>
            );
          })
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
