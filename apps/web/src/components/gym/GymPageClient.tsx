"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

type MembershipStatus = "NONE" | "PENDING" | "ACTIVE" | "UNKNOWN";

type GymMembership = {
  status: MembershipStatus;
  gymId: string | null;
  gymName: string | null;
  role: string | null;
};

type GymItem = {
  id: string;
  name: string;
};

const defaultMembership: GymMembership = {
  status: "UNKNOWN",
  gymId: null,
  gymName: null,
  role: null,
};

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readMembership(payload: unknown): GymMembership {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const data = typeof source.data === "object" && source.data !== null ? (source.data as Record<string, unknown>) : source;
  const rawStatus = toStringOrNull(data.status)?.toUpperCase();

  const status: MembershipStatus = rawStatus === "NONE" || rawStatus === "PENDING" || rawStatus === "ACTIVE" ? rawStatus : "UNKNOWN";

  return {
    status,
    gymId: toStringOrNull(data.gymId) ?? toStringOrNull(data.tenantId),
    gymName: toStringOrNull(data.gymName) ?? toStringOrNull(data.tenantName),
    role: toStringOrNull(data.role),
  };
}

function readGyms(payload: unknown): GymItem[] {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const items = Array.isArray(source.data) ? source.data : Array.isArray(source.gyms) ? source.gyms : Array.isArray(payload) ? payload : [];

  return items
    .map((entry) => {
      const row = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
      const id = toStringOrNull(row.id) ?? toStringOrNull(row.gymId);
      const name = toStringOrNull(row.name) ?? toStringOrNull(row.gymName);
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((entry): entry is GymItem => Boolean(entry));
}

export default function GymPageClient() {
  const { t } = useLanguage();
  const { isAdmin, isTrainer } = useAccess();

  const [membership, setMembership] = useState<GymMembership>(defaultMembership);
  const [gyms, setGyms] = useState<GymItem[]>([]);
  const [selectedGymId, setSelectedGymId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestingJoin, setRequestingJoin] = useState(false);
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canOpenAdmin = useMemo(() => membership.status === "ACTIVE" && (isAdmin || isTrainer), [membership.status, isAdmin, isTrainer]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [membershipRes, gymsRes] = await Promise.all([
        fetch("/api/gyms/membership", { cache: "no-store", credentials: "include" }),
        fetch("/api/gyms", { cache: "no-store", credentials: "include" }),
      ]);

      if (!membershipRes.ok) throw new Error("membership");
      const membershipData = readMembership(await membershipRes.json());
      setMembership(membershipData);

      if (gymsRes.ok) {
        const gymsData = readGyms(await gymsRes.json());
        setGyms(gymsData);
        if (!selectedGymId && gymsData[0]) {
          setSelectedGymId(gymsData[0].id);
        }
      } else {
        setGyms([]);
      }
    } catch {
      setError(t("gym.loadError"));
    } finally {
      setLoading(false);
    }
  }, [selectedGymId, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const requestJoin = async () => {
    if (!selectedGymId) return;
    setRequestingJoin(true);
    setActionError(null);

    try {
      const response = await fetch("/api/gyms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gymId: selectedGymId }),
      });
      if (!response.ok) throw new Error("join");
      await loadData();
    } catch {
      setActionError(t("gym.joinRequestError"));
    } finally {
      setRequestingJoin(false);
    }
  };

  const joinUsingCode = async () => {
    if (!joinCode.trim()) return;
    setJoiningByCode(true);
    setActionError(null);

    try {
      const response = await fetch("/api/gyms/join-by-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ joinCode: joinCode.trim() }),
      });
      if (!response.ok) throw new Error("join-by-code");
      setJoinCode("");
      await loadData();
    } catch {
      setActionError(t("gym.joinCodeError"));
    } finally {
      setJoiningByCode(false);
    }
  };

  if (loading) {
    return (
      <section className="card">
        <Skeleton variant="line" className="w-45" />
        <Skeleton variant="line" className="w-70" />
        <Skeleton className="h-20 mt-3" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="card status-card status-card--warning">
        <strong>{t("gym.loadErrorTitle")}</strong>
        <p className="muted">{error}</p>
        <Button variant="secondary" onClick={() => void loadData()}>{t("ui.retry")}</Button>
      </section>
    );
  }

  return (
    <div className="page" style={{ gap: "0.75rem" }}>
      {membership.status === "NONE" ? (
        <>
          <section className="card form-stack">
            <h2 className="section-title section-title-sm">{t("gym.joinGymTitle")}</h2>
            <p className="section-subtitle">{t("gym.joinGymSubtitle")}</p>
            {gyms.length === 0 ? (
              <p className="muted">{t("ui.notAvailable")}</p>
            ) : (
              <label className="form-stack">
                {t("gym.gymFieldLabel")}
                <select value={selectedGymId} onChange={(event) => setSelectedGymId(event.target.value)}>
                  {gyms.map((gym) => (
                    <option key={gym.id} value={gym.id}>
                      {gym.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Button onClick={() => void requestJoin()} disabled={requestingJoin || !selectedGymId || gyms.length === 0}>
              {requestingJoin ? t("gym.sending") : t("gym.requestJoin")}
            </Button>
          </section>

          <section className="card form-stack">
            <h2 className="section-title section-title-sm">{t("gym.joinByCodeTitle")}</h2>
            <p className="section-subtitle">{t("gym.joinByCodeSubtitle")}</p>
            <label className="form-stack">
              {t("gym.joinCodeFieldLabel")}
              <input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder={t("gym.joinCodePlaceholder")} />
            </label>
            <Button onClick={() => void joinUsingCode()} disabled={joiningByCode || !joinCode.trim()}>
              {joiningByCode ? t("gym.sending") : t("gym.joinByCode")}
            </Button>
          </section>
        </>
      ) : null}

      {membership.status === "PENDING" ? (
        <section className="card status-card">
          <strong>{t("gym.pendingTitle")}</strong>
          <p className="muted">{t("gym.pendingDescription", { gymName: membership.gymName ?? t("ui.notAvailable") })}</p>
        </section>
      ) : null}

      {membership.status === "ACTIVE" ? (
        <section className="card status-card">
          <strong>{t("gym.activeTitle")}</strong>
          <p className="muted">{t("gym.activeDescription", { gymName: membership.gymName ?? t("ui.notAvailable"), role: membership.role ?? t("ui.notAvailable") })}</p>
          {canOpenAdmin ? (
            <Link href="/app/gym/admin" className="btn secondary fit-content">{t("gym.openAdmin")}</Link>
          ) : null}
        </section>
      ) : null}

      {membership.status === "UNKNOWN" ? (
        <section className="card status-card">
          <strong>{t("gym.unavailableTitle")}</strong>
          <p className="muted">{t("ui.notAvailable")}</p>
        </section>
      ) : null}

      {actionError ? (
        <section className="card status-card status-card--warning">
          <strong>{t("gym.actionErrorTitle")}</strong>
          <p className="muted">{actionError}</p>
        </section>
      ) : null}
    </div>
  );
}
