"use client";

import { useEffect, useMemo, useState } from "react";
import GymJoinRequestsManager from "@/components/admin/GymJoinRequestsManager";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";
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

type CreateField = "name" | "code";
type FieldErrorMap = Partial<Record<CreateField, string>>;

type MaybeErrorPayload = {
  message?: unknown;
  error?: unknown;
  details?: unknown;
};

type MaybeGymsPayload = {
  gyms?: unknown;
  items?: unknown;
  data?: unknown;
};

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(", ");
  return "";
}

function parseGenericError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const source = payload as MaybeErrorPayload;
  const details = source.details && typeof source.details === "object" ? (source.details as MaybeErrorPayload & { fieldErrors?: Record<string, unknown>; formErrors?: unknown }) : null;

  if (details?.fieldErrors && typeof details.fieldErrors === "object") {
    for (const value of Object.values(details.fieldErrors)) {
      const text = toText(value);
      if (text) return text;
    }
  }

  return toText(source.message) || toText(source.error) || toText(details?.message) || toText(details?.error) || toText(details?.formErrors);
}

function normalizeGymsPayload(payload: unknown): Gym[] {
  if (Array.isArray(payload)) return payload as Gym[];

  const source = payload && typeof payload === "object" ? (payload as MaybeGymsPayload) : null;
  if (Array.isArray(source?.gyms)) return source.gyms as Gym[];
  if (Array.isArray(source?.items)) return source.items as Gym[];
  if (Array.isArray(source?.data)) return source.data as Gym[];

  if (process.env.NODE_ENV !== "production") {
    console.warn("[AdminGymsClient] Unexpected /api/admin/gyms payload shape", payload);
  }

  return [];
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
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersUnsupported, setMembersUnsupported] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [roleUpdateUnsupported, setRoleUpdateUnsupported] = useState(false);
  const [roleUpdateUserId, setRoleUpdateUserId] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUnsupported, setDeleteUnsupported] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});

  const gymsList = useMemo(() => (Array.isArray(gyms) ? gyms : []), [gyms]);

  const selectedGym = useMemo(() => {
    return gymsList.find((gym) => gym.id === selectedGymId) ?? null;
  }, [gymsList, selectedGymId]);

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
      const payload = (await res.json().catch(() => null)) as unknown;

      if (!res.ok) {
        setGyms([]);
        setSelectedGymId("");
        setListError(parseGenericError(payload) || t("adminGyms.errors.load"));
        return;
      }

      const data = normalizeGymsPayload(payload);
      const payloadHasArray =
        Array.isArray(payload) ||
        (payload &&
          typeof payload === "object" &&
          (Array.isArray((payload as MaybeGymsPayload).gyms) || Array.isArray((payload as MaybeGymsPayload).items) || Array.isArray((payload as MaybeGymsPayload).data)));

      if (!payloadHasArray) {
        setGyms([]);
        setSelectedGymId("");
        setListError(t("adminGyms.errors.load"));
        setUnsupported(false);
        return;
      }

      setUnsupported(false);
      setGyms(data);
      setSelectedGymId((current) => (current && data.some((gym) => gym.id === current) ? current : data[0]?.id || ""));
    } catch (_err) {
      setGyms([]);
      setSelectedGymId("");
      setListError(t("adminGyms.errors.load"));
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (gymId: string) => {
    if (!gymId) {
      setMembers([]);
      setMembersError(null);
      return;
    }

    setMembersLoading(true);
    setMembersError(null);
    try {
      const res = await fetch(`/api/admin/gyms/${gymId}/members`, { cache: "no-store", credentials: "include" });
      if (res.status === 404 || res.status === 405) {
        setMembersUnsupported(true);
        setMembers([]);
        setMembersError(null);
        return;
      }
      if (!res.ok) throw new Error("members");
      const data = (await res.json()) as Member[];
      setMembersUnsupported(false);
      setMembersError(null);
      setMembers(data.filter((member) => member.status === "ACTIVE"));
    } catch (_err) {
      setMembers([]);
      setMembersError(t("adminGyms.errors.members"));
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
    const nextErrors: FieldErrorMap = {
      ...(name.trim() ? {} : { name: t("ui.required") }),
    };
    setFieldErrors(nextErrors);
    return !nextErrors.name;
  };

  const createGym = async () => {
    if (!validateCreate() || createLoading) return;

    setError(null);
    setFieldErrors({});
    setCreatedCode(null);
    setCreateLoading(true);

    try {
      const result = await createAdminGym({
        name: name.trim(),
        ...(code.trim().length > 0 ? { code: code.trim() } : {}),
      });

      if (!result.ok) {
        if (Object.keys(result.error.fieldErrors).length > 0) {
          setFieldErrors(result.error.fieldErrors);
        }
        const firstFieldError = Object.values(result.error.fieldErrors).find((value) => typeof value === "string" && value.trim().length > 0);
        setError(result.error.formError || firstFieldError || t("adminGyms.errors.create"));
        return;
      }

      setCreatedCode(result.data.activationCode || result.data.code || null);
      setName("");
      setCode("");
      await loadGyms();
      setSelectedGymId(result.data.id);

      notify({
        title: t("common.success"),
        description: t("adminGyms.created"),
        variant: "success",
      });
    } catch (_err) {
      setError(t("adminGyms.errors.create"));
    } finally {
      setCreateLoading(false);
    }
  };

  const deleteGym = async () => {
    if (!selectedGymId) return;

    setError(null);
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/gyms/${selectedGymId}`, {
        method: "DELETE",
        cache: "no-store",
        credentials: "include",
      });
      const payload = (await res.json().catch(() => null)) as unknown;

      if (res.status === 404 || res.status === 405) {
        setDeleteUnsupported(true);
        return;
      }

      if (!res.ok) {
        setDeleteError(parseGenericError(payload) || t("adminGyms.errors.delete"));
        return;
      }

      setCreatedCode(null);
      setDeleteOpen(false);
      await loadGyms();
      notify({
        title: t("common.success"),
        description: t("adminGyms.deleted"),
        variant: "success",
      });
    } catch (_err) {
      setDeleteError(t("adminGyms.errors.delete"));
    } finally {
      setDeleteLoading(false);
    }
  };

  const setMemberRole = async (userId: string, role: "TRAINER" | "MEMBER") => {
    if (!selectedGymId || roleUpdateUserId) return;
    setError(null);
    setRoleUpdateUserId(userId);
    try {
      const res = await fetch(`/api/admin/gyms/${selectedGymId}/members/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({ role }),
      });

      if (res.status === 404 || res.status === 405) {
        setRoleUpdateUnsupported(true);
        return;
      }

      if (!res.ok) throw new Error("role");
      setRoleUpdateUnsupported(false);
      await loadMembers(selectedGymId);
      notify({
        title: t("common.success"),
        description: role === "TRAINER" ? t("adminGyms.roleUpdatedTrainer") : t("adminGyms.roleUpdatedMember"),
        variant: "success",
      });
    } catch (_err) {
      setError(t("adminGyms.errors.role"));
      notify({
        title: t("common.error"),
        description: t("adminGyms.errors.role"),
        variant: "error",
      });
    } finally {
      setRoleUpdateUserId(null);
    }
  };

  if (accessLoading) {
    return <LoadingState ariaLabel={t("adminGyms.loadingAccess")} title={t("adminGyms.loadingAccess")} lines={3} />;
  }
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
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder={t("adminGyms.createPlaceholder")}
          />
          {fieldErrors.name ? <p className="muted" style={{ margin: 0 }}>{fieldErrors.name}</p> : null}
        </label>
        <label className="form-stack">
          {t("adminGyms.createCode")}
          <input
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              if (fieldErrors.code) setFieldErrors((prev) => ({ ...prev, code: undefined }));
            }}
            placeholder={t("adminGyms.createCodePlaceholder")}
          />
          {fieldErrors.code ? <p className="muted" style={{ margin: 0 }}>{fieldErrors.code}</p> : null}
        </label>
        <Button onClick={() => void createGym()} disabled={createLoading || !name.trim()} loading={createLoading}>
          {t("adminGyms.createAction")}
        </Button>
        {createdCode ? <p className="muted">{t("adminGyms.createdCode").replace("{code}", createdCode)}</p> : null}
      </section>

      <section className="card form-stack">
        <h2 className="section-title section-title-sm">{t("adminGyms.listTitle")}</h2>
        {loading ? (
          <div className="form-stack" aria-hidden="true">
            <Skeleton variant="line" style={{ width: "45%" }} />
            <Skeleton variant="line" style={{ width: "70%" }} />
            <Skeleton variant="line" style={{ width: "60%" }} />
          </div>
        ) : null}
        {!loading && listError ? (
          <ErrorState
            title={t("adminGyms.errorTitle")}
            description={listError}
            retryLabel={t("common.retry")}
            onRetry={() => void loadGyms()}
            wrapInCard
          />
        ) : null}
        {!loading && !listError && gymsList.length === 0 ? (
          <EmptyState
            title={t("adminGyms.empty")}
            description={t("adminGyms.emptyDescription")}
            actions={[{ label: t("common.retry"), onClick: () => void loadGyms(), variant: "secondary" }]}
            wrapInCard
          />
        ) : null}
        {!loading && !listError && gymsList.length > 0 ? (
          <>
            <select value={selectedGymId} onChange={(event) => setSelectedGymId(event.target.value)}>
              {gymsList.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name}
                </option>
              ))}
            </select>
            {gymsList.map((gym) => (
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
        {!membersUnsupported && !membersLoading && membersError ? <p className="muted">{membersError}</p> : null}
        {!membersUnsupported && !membersLoading && membersError ? <Button variant="secondary" onClick={() => void loadMembers(selectedGymId)}>{t("common.retry")}</Button> : null}
        {!membersUnsupported && !membersLoading && !membersError && members.length === 0 ? <p className="muted">{t("adminGyms.membersEmpty")}</p> : null}
        {!membersUnsupported && !membersLoading && !membersError && members.length > 0
          ? members.map((member) => (
              <div key={member.user.id} className="status-card" style={{ marginTop: 8 }}>
                <strong>{member.user.name ?? member.user.email}</strong>
                <p className="muted" style={{ margin: 0 }}>{`${member.user.email} · ${member.role}`}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    onClick={() => void setMemberRole(member.user.id, "TRAINER")}
                    disabled={member.role === "TRAINER" || roleUpdateUnsupported || Boolean(roleUpdateUserId)}
                    loading={roleUpdateUserId === member.user.id}
                  >
                    {t("adminGyms.promoteTrainer")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void setMemberRole(member.user.id, "MEMBER")}
                    disabled={member.role === "MEMBER" || roleUpdateUnsupported || Boolean(roleUpdateUserId)}
                    loading={roleUpdateUserId === member.user.id}
                  >
                    {t("adminGyms.demoteMember")}
                  </Button>
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
