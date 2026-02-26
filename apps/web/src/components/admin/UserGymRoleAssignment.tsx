"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageProvider";

type GymOption = { id: string; name: string };

type GymsResponse = {
  gyms?: Array<{ id?: string | null; name?: string | null }>;
};

type ErrorPayload = { error?: string };

type Props = {
  userId: string;
  onAssigned?: () => void;
};

function normalizeGyms(payload: GymsResponse | ErrorPayload | null): GymOption[] {
  const source: Array<{ id?: string | null; name?: string | null }> =
    payload && "gyms" in payload && Array.isArray(payload.gyms) ? payload.gyms : [];

  return source.flatMap((gym: { id?: string | null; name?: string | null }) => {
    const id = typeof gym?.id === "string" ? gym.id.trim() : "";
    const name = typeof gym?.name === "string" ? gym.name.trim() : "";
    if (!id) return [];
    return [{ id, name: name || id }];
  });
}

function parseErrorCode(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }

  return typeof payload.error === "string" ? payload.error : null;
}

function getFriendlyError(t: ReturnType<typeof useLanguage>["t"], status: number, errorCode: string | null): string {
  if (status === 502 || errorCode === "UPSTREAM_ERROR") {
    return t("admin.usersAssignGymRoleServiceUnavailable");
  }

  if (errorCode) {
    return errorCode;
  }

  return t("admin.usersAssignGymRoleError");
}

export default function UserGymRoleAssignment({ userId, onAssigned }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gyms, setGyms] = useState<GymOption[]>([]);
  const [selectedGymId, setSelectedGymId] = useState("");
  const [assigningRole, setAssigningRole] = useState<"CLIENT" | "TRAINER" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
        const response = await fetch("/api/admin/gyms", {
          cache: "no-store",
          credentials: "include",
        });

        const payload = (await response.json().catch(() => null)) as GymsResponse | ErrorPayload | null;
        if (!active) return;

        if (!response.ok) {
          const errorCode = parseErrorCode(payload);
          setError(getFriendlyError(t, response.status, errorCode));
          setGyms([]);
          setSelectedGymId("");
          return;
        }

        const normalizedGyms = normalizeGyms(payload);
        setGyms(normalizedGyms);
        setSelectedGymId((current) => (current && normalizedGyms.some((gym) => gym.id === current) ? current : normalizedGyms[0]?.id ?? ""));
      } catch {
        if (!active) return;
        setError(t("admin.usersAssignGymRoleServiceUnavailable"));
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [t, userId]);

  const hasGyms = gyms.length > 0;
  const disabled = useMemo(() => loading || assigningRole !== null || !selectedGymId || !hasGyms, [assigningRole, hasGyms, loading, selectedGymId]);

  const assignRole = async (role: "CLIENT" | "TRAINER") => {
    if (disabled) return;

    setAssigningRole(role);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/gym-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gymId: selectedGymId, role }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
        setError(getFriendlyError(t, response.status, parseErrorCode(payload)));
        return;
      }

      setMessage(role === "TRAINER" ? t("admin.usersAssignTrainerSuccess") : t("admin.usersAssignClientSuccess"));
      onAssigned?.();
    } catch {
      setError(t("admin.usersAssignGymRoleServiceUnavailable"));
    } finally {
      setAssigningRole(null);
    }
  };

  return (
    <section className="status-card" style={{ gap: 8 }}>
      <strong>{t("admin.usersAssignGymRoleTitle")}</strong>
      {loading ? <p className="muted" style={{ margin: 0 }}>{t("common.loading")}</p> : null}
      {!loading && !hasGyms ? <p className="muted" style={{ margin: 0 }}>{t("admin.usersAssignGymRoleNoGyms")}</p> : null}
      {!loading && hasGyms ? (
        <>
          <label className="muted" htmlFor={`assign-gym-${userId}`}>{t("admin.usersAssignGymRoleGymLabel")}</label>
          <select id={`assign-gym-${userId}`} value={selectedGymId} onChange={(event) => setSelectedGymId(event.target.value)}>
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>{gym.name}</option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button
              variant="secondary"
              onClick={() => void assignRole("CLIENT")}
              loading={assigningRole === "CLIENT"}
              disabled={disabled}
            >
              {t("admin.usersAssignClientAction")}
            </Button>
            <Button
              onClick={() => void assignRole("TRAINER")}
              loading={assigningRole === "TRAINER"}
              disabled={disabled}
            >
              {t("admin.usersAssignTrainerAction")}
            </Button>
          </div>
        </>
      ) : null}

      {message ? <p className="muted" style={{ margin: 0 }}>{message}</p> : null}
      {error ? <p className="muted" style={{ margin: 0 }}>{error}</p> : null}
    </section>
  );
}
