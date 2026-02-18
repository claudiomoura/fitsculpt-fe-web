"use client";

import { useEffect, useMemo, useState } from "react";
import GymJoinRequestsManager from "@/components/admin/GymJoinRequestsManager";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";

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

type ApiValidationPayload = {
  message?: string;
  errors?: Record<string, string | string[]>;
  fieldErrors?: Record<string, string | string[]>;
  details?: Array<{ field?: string; message?: string }>;
  issues?: Array<{ path?: Array<string | number>; message?: string }>;
};

type CreateField = "name" | "code";

function pickFieldError(payload: ApiValidationPayload | null, field: CreateField): string | null {
  const fromRecord = (record?: Record<string, string | string[]>) => {
    const value = record?.[field];
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
  };

  const explicit = fromRecord(payload?.fieldErrors) ?? fromRecord(payload?.errors);
  if (explicit) return explicit;

  const fromDetails = payload?.details?.find((item) => item.field === field)?.message;
  if (fromDetails) return fromDetails;

  const fromIssues = payload?.issues?.find((item) => String(item.path?.[0] ?? "") === field)?.message;
  return fromIssues ?? null;
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

  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<CreateField, string | null>>({ name: null, code: null });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteUnsupported, setDeleteUnsupported] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const selectedGym = useMemo(() => gyms.find((gym) => gym.id === selectedGymId) ?? null, [gyms, selectedGymId]);

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
      setSelectedGymId((current) => (current && data.some((item) => item.id === current) ? current : data[0]?.id ?? ""));
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
    if (!validateCreate()) return;

    setCreateError(null);
    setCreatedCode(null);
    setCreateLoading(true);

    try {
      const res = await fetch("/api/admin/gyms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), code: code.trim() }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as ApiValidationPayload | null;
        const nextFieldErrors: Record<CreateField, string | null> = {
          name: pickFieldError(payload, "name"),
          code: pickFieldError(payload, "code"),
        };
        setCreateFieldErrors(nextFieldErrors);
        if (!nextFieldErrors.name && !nextFieldErrors.code) {
          setCreateError(payload?.message ?? t("adminGyms.errors.create"));
        }
        throw new Error("create");
      }

      const created = (await res.json()) as { id: string; joinCode?: string; code?: string; activationCode?: string };
      setCreateFieldErrors({ name: null, code: null });
      setName("");
      setCode("");
      setCreatedCode(created.activationCode ?? created.joinCode ?? created.code ?? null);
      await loadGyms();
      setSelectedGymId(created.id);
    } catch (cause) {
      if (!(cause instanceof Error && cause.message === "create")) {
        setCreateError(t("adminGyms.errors.create"));
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const deleteGym = async () => {
    if (!selectedGym) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/gyms/${selectedGym.id}`, {
        method: "DELETE",
        cache: "no-store",
        credentials: "include",
      });

      if (res.status === 404 || res.status === 405) {
        setDeleteUnsupported(true);
        setDeleteOpen(false);
        setDeleteError(t("access.notAvailableDescription"));
        return;
      }

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        const message = payload?.message ?? t("adminGyms.errors.load");
        setDeleteError(message);
        notify({ variant: "error", title: t("admin.usersError"), description: message });
        return;
      }

      setDeleteUnsupported(false);
      setDeleteOpen(false);
      notify({ variant: "success", title: t("ui.delete"), description: t("tracking.deleteSuccess") });
      await loadGyms();
      setMembers([]);
    } catch {
      const message = t("adminGyms.errors.load");
      setDeleteError(message);
      notify({ variant: "error", title: t("admin.usersError"), description: message });
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
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          label={t("adminGyms.createName")}
          placeholder={t("adminGyms.createPlaceholder")}
          errorText={createFieldErrors.name ?? undefined}
          required
        />
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          label={t("adminGyms.joinCodeLabel")}
          placeholder={t("gym.join.codeLabel")}
          errorText={createFieldErrors.code ?? undefined}
          required
        />
        <Button onClick={() => void createGym()} loading={createLoading} disabled={createLoading}>{t("adminGyms.createAction")}</Button>
        {createError ? <p className="muted">{createError}</p> : null}
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
