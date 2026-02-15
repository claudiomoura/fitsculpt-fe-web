"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";
import GymJoinRequestsManager from "@/components/admin/GymJoinRequestsManager";

type Gym = {
  id: string;
  name: string;
  joinCode?: string;
  code?: string;
  activationCode?: string;
  membersCount?: number;
  requestsCount?: number;
};

type Member = {
  user: { id: string; email: string; name: string | null };
  status: "ACTIVE" | "PENDING" | "REJECTED";
  role: "MEMBER" | "TRAINER" | "ADMIN";
};

export default function AdminGymsClient() {
  const { t } = useLanguage();
  const { isAdmin, isLoading: accessLoading } = useAccess();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [selectedGymId, setSelectedGymId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGyms = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/gyms", { cache: "no-store", credentials: "include" });
      if (res.status === 404 || res.status === 405) {
        setUnsupported(true);
        setGyms([]);
        setSelectedGymId("");
        return;
      }
      if (!res.ok) throw new Error("gyms");
      const data = (await res.json()) as Gym[];
      setUnsupported(false);
      setGyms(data);
      setSelectedGymId((current) => current || data[0]?.id || "");
    } catch {
      setError(t("adminGyms.errors.load"));
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (gymId: string) => {
    if (!gymId) return setMembers([]);
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/admin/gyms/${gymId}/members`, { cache: "no-store", credentials: "include" });
      if (!res.ok) throw new Error("members");
      const data = (await res.json()) as Member[];
      setMembers(data.filter((member) => member.status === "ACTIVE"));
    } catch {
      setMembers([]);
      setError(t("adminGyms.errors.members"));
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) void loadGyms();
  }, [isAdmin]);

  useEffect(() => {
    void loadMembers(selectedGymId);
  }, [selectedGymId]);

  const createGym = async () => {
    if (!name.trim()) return;
    setError(null);
    setCreatedCode(null);

    try {
      const res = await fetch("/api/admin/gyms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error("create");
      const created = (await res.json()) as { id: string; joinCode?: string; code?: string; activationCode?: string };
      setCreatedCode(created.activationCode ?? created.joinCode ?? created.code ?? null);
      setName("");
      await loadGyms();
      setSelectedGymId(created.id);
    } catch {
      setError(t("adminGyms.errors.create"));
    }
  };

  const setMemberRole = async (userId: string, role: "TRAINER" | "MEMBER") => {
    if (!selectedGymId) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/gyms/${selectedGymId}/members/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({ role, status: "ACTIVE" }),
      });
      if (!res.ok) throw new Error("role");
      await loadMembers(selectedGymId);
    } catch {
      setError(t("adminGyms.errors.role"));
    }
  };

  if (accessLoading) return <p className="muted">{t("common.loading")}</p>;
  if (!isAdmin) return <p className="muted">{t("admin.unauthorized")}</p>;

  if (unsupported) {
    return (
      <section className="card status-card">
        <strong>{t("access.notAvailableTitle")}</strong>
        <p className="muted">{t("access.notAvailableDescription")}</p>
      </section>
    );
  }

  return (
    <div className="page form-stack">
      <section className="card form-stack">
        <h1 className="section-title">{t("adminGyms.title")}</h1>
        <label className="form-stack">
          {t("adminGyms.createName")}
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("adminGyms.createPlaceholder")} />
        </label>
        <Button onClick={() => void createGym()} disabled={!name.trim()}>{t("adminGyms.createAction")}</Button>
        {createdCode ? <p className="muted">{t("adminGyms.createdCode").replace("{code}", createdCode)}</p> : null}
      </section>

      <section className="card form-stack">
        <h2 className="section-title section-title-sm">{t("adminGyms.listTitle")}</h2>
        {loading ? <p className="muted">{t("common.loading")}</p> : null}
        {!loading && gyms.length === 0 ? <p className="muted">{t("adminGyms.empty")}</p> : null}
        {!loading && gyms.length > 0 ? (
          <>
            <select value={selectedGymId} onChange={(event) => setSelectedGymId(event.target.value)}>
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name}
                </option>
              ))}
            </select>
            {gyms.map((gym) => (
              <p className="muted" style={{ margin: 0 }} key={`${gym.id}-meta`}>
                {`${gym.name} · ${t("adminGyms.joinCodeLabel")}: ${gym.activationCode ?? gym.joinCode ?? gym.code ?? "-"} · ${t("adminGyms.membersCountLabel")}: ${gym.membersCount ?? 0} · ${t("adminGyms.requestsCountLabel")}: ${gym.requestsCount ?? 0}`}
              </p>
            ))}
          </>
        ) : null}
      </section>

      <section className="card form-stack">
        <h2 className="section-title section-title-sm">{t("admin.gymRequestsTitle")}</h2>
        <GymJoinRequestsManager />
      </section>

      <section className="card form-stack">
        <h2 className="section-title section-title-sm">{t("adminGyms.membersTitle")}</h2>
        {membersLoading ? <p className="muted">{t("common.loading")}</p> : null}
        {!membersLoading && members.length === 0 ? <p className="muted">{t("adminGyms.membersEmpty")}</p> : null}
        {!membersLoading && members.length > 0
          ? members.map((member) => (
              <div key={member.user.id} className="status-card" style={{ marginTop: 8 }}>
                <strong>{member.user.name ?? member.user.email}</strong>
                <p className="muted" style={{ margin: 0 }}>{`${member.user.email} · ${member.role}`}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button onClick={() => void setMemberRole(member.user.id, "TRAINER")} disabled={member.role === "TRAINER"}>{t("adminGyms.promoteTrainer")}</Button>
                  <Button variant="secondary" onClick={() => void setMemberRole(member.user.id, "MEMBER")} disabled={member.role === "MEMBER"}>{t("adminGyms.demoteMember")}</Button>
                </div>
              </div>
            ))
          : null}
      </section>

      {error ? <section className="card status-card status-card--warning"><p className="muted">{error}</p></section> : null}
    </div>
  );
}
