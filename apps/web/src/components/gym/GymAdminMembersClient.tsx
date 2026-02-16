"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { AssignTrainingPlanModal } from "@/components/gym/AssignTrainingPlanModal";
import { useLanguage } from "@/context/LanguageProvider";
import { Button } from "@/components/ui/Button";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
};

type UsersResponse = {
  users?: UserRow[];
};

type ProfilePayload = {
  gymId?: string;
  tenantId?: string;
  tenant?: { id?: string; gymId?: string; tenantId?: string } | string;
};

type MembersState = "loading" | "ready";

function resolveGymId(profile: ProfilePayload | null): string | null {
  if (!profile) return null;
  const tenant = typeof profile.tenant === "object" && profile.tenant ? profile.tenant : null;
  return profile.gymId ?? profile.tenantId ?? tenant?.gymId ?? tenant?.tenantId ?? tenant?.id ?? null;
}

export function GymAdminMembersClient() {
  const { t } = useLanguage();
  const [gymId, setGymId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [state, setState] = useState<MembersState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setState("loading");
    setError(null);
    setIsUnavailable(false);
    setSuccessMessage(null);

    try {
      const [profileRes, usersRes] = await Promise.all([
        fetch("/api/profile", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/users?page=1", { cache: "no-store", credentials: "include" }),
      ]);

      if (!profileRes.ok) {
        setError(t("gym.admin.members.profileError"));
        return;
      }

      const profile = (await profileRes.json()) as ProfilePayload;
      const nextGymId = resolveGymId(profile);
      if (!nextGymId) {
        setError(t("gym.admin.members.missingGymId"));
        return;
      }

      if (usersRes.status === 404 || usersRes.status === 405) {
        setGymId(nextGymId);
        setUsers([]);
        setIsUnavailable(true);
        return;
      }

      if (!usersRes.ok) {
        setGymId(nextGymId);
        setError(t("gym.admin.members.loadError"));
        return;
      }

      const usersPayload = (await usersRes.json()) as UsersResponse;
      setGymId(nextGymId);
      setUsers(usersPayload.users ?? []);
    } catch {
      setError(t("gym.admin.members.loadError"));
    } finally {
      setState("ready");
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const hasUsers = useMemo(() => users.length > 0, [users]);

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

      {state === "ready" && !error && isUnavailable ? (
        <EmptyState
          title={t("common.comingSoon")}
          description={t("gym.admin.members.unavailable")}
          wrapInCard
          actions={[{ label: t("ui.retry"), onClick: () => void loadData(), variant: "secondary" }]}
        />
      ) : null}

      {state === "ready" && !error && !isUnavailable && !hasUsers ? (
        <EmptyState title={t("gym.admin.members.empty")} wrapInCard icon="info" />
      ) : null}

      {state === "ready" && !error && !isUnavailable && hasUsers
        ? users.map((user) => (
            <section key={user.id} className="feature-card" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <strong>{user.name || user.email}</strong>
                <p className="muted">{user.email}</p>
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
          userLabel={selectedUser.name || selectedUser.email}
          onClose={() => setSelectedUser(null)}
          onAssigned={() => setSuccessMessage(t("gym.admin.members.assignSuccess"))}
        />
      ) : null}
    </div>
  );
}
