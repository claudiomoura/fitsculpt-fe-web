"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { AssignTrainingPlanModal } from "@/components/gym/AssignTrainingPlanModal";
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

function resolveGymId(profile: ProfilePayload | null): string | null {
  if (!profile) return null;
  const tenant = typeof profile.tenant === "object" && profile.tenant ? profile.tenant : null;
  return profile.gymId ?? profile.tenantId ?? tenant?.gymId ?? tenant?.tenantId ?? tenant?.id ?? null;
}

export function GymAdminMembersClient() {
  const { t } = useLanguage();
  const [gymId, setGymId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const [profileRes, usersRes] = await Promise.all([
        fetch("/api/profile", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/users?page=1", { cache: "no-store", credentials: "include" }),
      ]);

      if (!profileRes.ok) {
        if (active) {
          setError(t("gym.admin.members.profileError"));
          setLoading(false);
        }
        return;
      }

      const profile = (await profileRes.json()) as ProfilePayload;
      const nextGymId = resolveGymId(profile);
      if (!nextGymId) {
        if (active) {
          setError(t("gym.admin.members.missingGymId"));
          setLoading(false);
        }
        return;
      }

      if (!usersRes.ok) {
        if (active) {
          setGymId(nextGymId);
          setError(t("gym.admin.members.loadError"));
          setLoading(false);
        }
        return;
      }

      const usersPayload = (await usersRes.json()) as UsersResponse;
      if (active) {
        setGymId(nextGymId);
        setUsers(usersPayload.users ?? []);
        setLoading(false);
      }
    };

    void loadData();
    return () => {
      active = false;
    };
  }, [t]);

  const hasUsers = useMemo(() => users.length > 0, [users]);

  return (
    <div className="form-stack">
      <section className="card">
        <h1 className="section-title">{t("gym.admin.members.title")}</h1>
        <p className="section-subtitle">{t("gym.admin.members.subtitle")}</p>
      </section>

      {successMessage ? <p className="muted">{successMessage}</p> : null}
      {loading ? <p className="muted">{t("gym.admin.members.loading")}</p> : null}
      {!loading && error ? <p className="muted">{error}</p> : null}
      {!loading && !error && !hasUsers ? <p className="muted">{t("gym.admin.members.empty")}</p> : null}

      {!loading && !error && hasUsers
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
