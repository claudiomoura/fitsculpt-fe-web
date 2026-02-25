"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageProvider";

type GymOption = { id: string; name: string };

type AssignCapabilityResponse = {
  available?: boolean;
  gyms?: Array<{ id?: string | null; name?: string | null }>;
  data?: {
    available?: boolean;
    gyms?: Array<{ id?: string | null; name?: string | null }>;
  };
};

type Props = {
  userId: string;
  onAssigned?: () => void;
};

function normalizeGyms(payload: AssignCapabilityResponse | null): GymOption[] {
  const source = payload?.gyms ?? payload?.data?.gyms ?? [];
  return source.flatMap((gym) => {
    const id = typeof gym?.id === "string" ? gym.id.trim() : "";
    const name = typeof gym?.name === "string" ? gym.name.trim() : "";
    if (!id) return [];
    return [{ id, name: name || id }];
  });
}

function resolveAvailable(payload: AssignCapabilityResponse | null, status: number): boolean {
  if (status === 404 || status === 405) return false;
  if (typeof payload?.available === "boolean") return payload.available;
  if (typeof payload?.data?.available === "boolean") return payload.data.available;
  return status >= 200 && status < 300;
}

export default function UserGymRoleAssignment({ userId, onAssigned }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
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
        const response = await fetch(`/api/admin/users/${userId}/gym-role`, {
          cache: "no-store",
          credentials: "include",
        });

        const payload = (await response.json().catch(() => null)) as AssignCapabilityResponse | null;
        if (!active) return;

        const available = resolveAvailable(payload, response.status);
        if (!available) {
          setUnsupported(true);
          setGyms([]);
          setSelectedGymId("");
          return;
        }

        const normalizedGyms = normalizeGyms(payload);
        setUnsupported(false);
        setGyms(normalizedGyms);
        setSelectedGymId((current) => (current && normalizedGyms.some((gym) => gym.id === current) ? current : normalizedGyms[0]?.id ?? ""));
      } catch (_error) {
        if (!active) return;
        setError(t("admin.usersAssignGymRoleError"));
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
  const disabled = useMemo(() => loading || unsupported || assigningRole !== null || !selectedGymId, [assigningRole, loading, selectedGymId, unsupported]);

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

      if (response.status === 404 || response.status === 405) {
        setUnsupported(true);
        setGyms([]);
        setSelectedGymId("");
        return;
      }

      if (!response.ok) {
        setError(t("admin.usersAssignGymRoleError"));
        return;
      }

      setMessage(role === "TRAINER" ? t("admin.usersAssignTrainerSuccess") : t("admin.usersAssignClientSuccess"));
      onAssigned?.();
    } catch (_error) {
      setError(t("admin.usersAssignGymRoleError"));
    } finally {
      setAssigningRole(null);
    }
  };

  return (
    <section className="status-card" style={{ gap: 8 }}>
      <strong>{t("admin.usersAssignGymRoleTitle")}</strong>
      {loading ? <p className="muted" style={{ margin: 0 }}>{t("common.loading")}</p> : null}
      {!loading && unsupported ? <p className="muted" style={{ margin: 0 }}>{t("ui.notAvailable")}</p> : null}
      {!loading && !unsupported && !hasGyms ? <p className="muted" style={{ margin: 0 }}>{t("admin.usersAssignGymRoleNoGyms")}</p> : null}
      {!loading && !unsupported && hasGyms ? (
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
