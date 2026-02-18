"use client";

import { useEffect, useMemo, useState } from "react";
import GymJoinRequestsManager from "@/components/admin/GymJoinRequestsManager";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
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

type FieldErrorMap = Record<string, string>;

type MaybeErrorPayload = {
  message?: unknown;
  error?: unknown;
  errors?: unknown;
  fieldErrors?: unknown;
};

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(", ");
  return "";
}

function parseFieldErrors(payload: unknown): FieldErrorMap {
  if (!payload || typeof payload !== "object") return {};

  const source = payload as MaybeErrorPayload;
  const container = (source.errors ?? source.fieldErrors) as unknown;
  if (!container || typeof container !== "object") return {};

  return Object.entries(container as Record<string, unknown>).reduce<FieldErrorMap>((acc, [key, value]) => {
    const text = toText(value);
    if (text) acc[key] = text;
    return acc;
  }, {});
}

function parseGenericError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const source = payload as MaybeErrorPayload;
  return toText(source.message) || toText(source.error);
}

export default function AdminGymsClient() {
  const { t } = useLanguage();
  const { notify } = useToast();
  const { isAdmin, isLoading: accessLoading } = useAccess();

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [selectedGymId, setSelectedGymId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [membersLoading, setMembersLoading] = useState(false);
  const [membersUnsupported, setMembersUnsupported] = useState(false);
  const [roleUpdateUnsupported, setRoleUpdateUnsupported] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});

  const loadGyms = async () => {
    setLoading(true);
    setListError(null);
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
      setSelectedGymId((current) => (current && data.some((gym) => gym.id === current) ? current : data[0]?.id || ""));
    } catch {
      setListError(t("adminGyms.errors.load"));
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

  const validateCreate = () => {
    const nextErrors: Record<CreateField, string | null> = {
      name: name.trim() ? null : t("ui.required"),
      code: code.trim() ? null : t("ui.required"),
    };
    setCreateFieldErrors(nextErrors);
    return !nextErrors.name && !nextErrors.code;
  };

  const createGym = async () => {
    if (!name.trim() || !code.trim()) return;
    setError(null);
    setFieldErrors({});
    setCreatedCode(null);
    setCreateLoading(true);

    try {
      const res = await fetch("/api/admin/gyms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({ name: name.trim() }),
      });

      const payload = (await res.json().catch(() => null)) as unknown;

      if (res.status === 400) {
        const nextFieldErrors = parseFieldErrors(payload);
        if (Object.keys(nextFieldErrors).length > 0) {
          setFieldErrors(nextFieldErrors);
          return;
        }
        setError(parseGenericError(payload) || t("adminGyms.errors.create"));
        return;
      }

      if (!res.ok) {
        setError(parseGenericError(payload) || t("adminGyms.errors.create"));
        return;
      }

      const created = payload as { id: string; joinCode?: string; code?: string; activationCode?: string };
      setCreatedCode(created.activationCode ?? created.joinCode ?? created.code ?? null);
      setName("");
      await loadGyms();
      setSelectedGymId(created.id);
    } catch {
      setError(t("adminGyms.errors.create"));
      return;
    }

    setCreatedCode(result.data.activationCode || result.data.code || null);
    setName("");
    setCode("");
    await loadGyms();
    setSelectedGymId(result.data.id);
  };

  const deleteGym = async () => {
    if (!selectedGymId) return;
    if (!window.confirm(t("adminGyms.deleteConfirm"))) return;

    setError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/gyms/${selectedGymId}`, {
        method: "DELETE",
        cache: "no-store",
        credentials: "include",
      });
      const payload = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        setError(parseGenericError(payload) || t("adminGyms.errors.delete"));
        return;
      }
      setCreatedCode(null);
      await loadGyms();
    } catch {
      setError(t("adminGyms.errors.delete"));
    } finally {
      setDeleteLoading(false);
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
        {fieldErrors.name ? <p className="muted" style={{ marginTop: 0 }}>{fieldErrors.name}</p> : null}
        <Button onClick={() => void createGym()} disabled={!name.trim()}>{t("adminGyms.createAction")}</Button>
        {createdCode ? <p className="muted">{t("adminGyms.createdCode").replace("{code}", createdCode)}</p> : null}
      </section>

      <section className="card form-stack">
        <h2 className="section-title section-title-sm">{t("adminGyms.listTitle")}</h2>
        {loading ? <p className="muted">{t("common.loading")}</p> : null}
        {!loading && listError ? <p className="muted">{listError}</p> : null}
        {!loading && listError ? <Button variant="secondary" onClick={() => void loadGyms()}>{t("common.retry")}</Button> : null}
        {!loading && !listError && gyms.length === 0 ? <p className="muted">{t("adminGyms.empty")}</p> : null}
        {!loading && !listError && gyms.length > 0 ? (
          <>
            <select value={selectedGymId} onChange={(event) => setSelectedGymId(event.target.value)}>
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={() => void deleteGym()} disabled={!selectedGymId || deleteLoading}>
              {deleteLoading ? t("common.loading") : t("adminGyms.deleteAction")}
            </Button>
            {gyms.map((gym) => (
              <p className="muted" style={{ margin: 0 }} key={`${gym.id}-meta`}>
                {`${gym.name} · ${t("adminGyms.joinCodeLabel")}: ${gym.activationCode ?? gym.joinCode ?? gym.code ?? t("ui.notAvailable")} · ${t("adminGyms.membersCountLabel")}: ${gym.membersCount ?? 0} · ${t("adminGyms.requestsCountLabel")}: ${gym.requestsCount ?? 0}`}
              </p>
            ))}
            <Button variant="danger" onClick={() => setDeleteOpen(true)} disabled={!selectedGym || deleteLoading || deleteUnsupported}>
              {t("ui.delete")}
            </Button>
            {deleteUnsupported ? <p className="muted">{t("access.notAvailableDescription")}</p> : null}
            {deleteError ? <p className="muted">{deleteError}</p> : null}
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

      <Modal
        open={deleteOpen}
        onClose={() => (deleteLoading ? null : setDeleteOpen(false))}
        title={t("ui.delete")}
        description={`${t("admin.confirmDelete")} ${selectedGym?.name ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>{t("ui.cancel")}</Button>
            <Button variant="danger" onClick={() => void deleteGym()} loading={deleteLoading}>{t("ui.delete")}</Button>
          </>
        }
      >
        <p className="muted">{t("admin.confirmDelete")}</p>
      </Modal>
    </div>
  );
}
