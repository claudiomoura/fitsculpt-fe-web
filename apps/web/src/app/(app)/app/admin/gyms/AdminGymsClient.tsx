"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";
import GymJoinRequestsManager from "@/components/admin/GymJoinRequestsManager";
import { createAdminGym } from "@/services/gym";

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
  const [code, setCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersUnsupported, setMembersUnsupported] = useState(false);
  const [roleUpdateUnsupported, setRoleUpdateUnsupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

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
      if (res.status === 404 || res.status === 405) {
        setMembersUnsupported(true);
        setMembers([]);
        return;
      }
      if (!res.ok) throw new Error("members");
      const data = (await res.json()) as Member[];
      setMembersUnsupported(false);
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
    if (!name.trim() || !code.trim()) return;
    setError(null);
    setNameError(null);
    setCodeError(null);
    setCreatedCode(null);

    const result = await createAdminGym({ name: name.trim(), code: code.trim() });

    if (!result.ok) {
      if (result.status === 400) {
        const nextNameError = result.error.fieldErrors.name ?? null;
        const nextCodeError = result.error.fieldErrors.code ?? null;
        setNameError(nextNameError);
        setCodeError(nextCodeError);
        setError(result.error.formError ?? (!nextNameError && !nextCodeError ? t("adminGyms.errors.create") : null));
        return;
      }
      setError(t("adminGyms.errors.create"));
      return;
    }

    setCreatedCode(result.data.activationCode || result.data.code || null);
    setName("");
    setCode("");
    await loadGyms();
    setSelectedGymId(result.data.id);
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
      if (res.status === 404 || res.status === 405) {
        setRoleUpdateUnsupported(true);
        return;
      }
      if (!res.ok) throw new Error("role");
      setRoleUpdateUnsupported(false);
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
          <input value={name} onChange={(event) => { setName(event.target.value); if (nameError) setNameError(null); }} placeholder={t("adminGyms.createPlaceholder")} />
          {nameError ? <p className="muted" style={{ margin: 0 }}>{nameError}</p> : null}
        </label>
        <label className="form-stack">
          {t("adminGyms.createCode")}
          <input value={code} onChange={(event) => { setCode(event.target.value); if (codeError) setCodeError(null); }} placeholder={t("adminGyms.createCodePlaceholder")} />
          {codeError ? <p className="muted" style={{ margin: 0 }}>{codeError}</p> : null}
        </label>
        <Button onClick={() => void createGym()} disabled={!name.trim() || !code.trim()}>{t("adminGyms.createAction")}</Button>
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
        {membersUnsupported ? <p className="muted">{t("adminGyms.membersUnavailable")}</p> : null}
        {membersLoading ? <p className="muted">{t("common.loading")}</p> : null}
        {!membersUnsupported && !membersLoading && members.length === 0 ? <p className="muted">{t("adminGyms.membersEmpty")}</p> : null}
        {!membersUnsupported && !membersLoading && members.length > 0
          ? members.map((member) => (
              <div key={member.user.id} className="status-card" style={{ marginTop: 8 }}>
                <strong>{member.user.name ?? member.user.email}</strong>
                <p className="muted" style={{ margin: 0 }}>{`${member.user.email} · ${member.role}`}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button onClick={() => void setMemberRole(member.user.id, "TRAINER")} disabled={member.role === "TRAINER" || roleUpdateUnsupported}>{t("adminGyms.promoteTrainer")}</Button>
                  <Button variant="secondary" onClick={() => void setMemberRole(member.user.id, "MEMBER")} disabled={member.role === "MEMBER" || roleUpdateUnsupported}>{t("adminGyms.demoteMember")}</Button>
                </div>
                {roleUpdateUnsupported ? <p className="muted" style={{ margin: 0 }}>{t("adminGyms.memberRoleUnavailable")}</p> : null}
              </div>
            ))
          : null}
      </section>

      {error ? <section className="card status-card status-card--warning"><p className="muted">{error}</p></section> : null}
    </div>
  );
}
