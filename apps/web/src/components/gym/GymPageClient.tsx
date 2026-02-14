"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

type MembershipStatus = "NONE" | "PENDING" | "ACTIVE" | "REJECTED" | "UNKNOWN";

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

function normalize(value: string | null): string | null {
  return value ? value.trim().toUpperCase() : null;
}

function readMembership(payload: unknown): GymMembership {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const data = typeof source.data === "object" && source.data !== null ? (source.data as Record<string, unknown>) : source;
  const gym = typeof data.gym === "object" && data.gym !== null ? (data.gym as Record<string, unknown>) : null;

  const rawStatus = normalize(toStringOrNull(data.state) ?? toStringOrNull(data.status));
  const status: MembershipStatus =
    rawStatus === "NONE" || rawStatus === "PENDING" || rawStatus === "ACTIVE" || rawStatus === "REJECTED"
      ? rawStatus
      : "UNKNOWN";

  return {
    status,
    gymId: toStringOrNull(data.gymId) ?? toStringOrNull(data.tenantId) ?? toStringOrNull(gym?.id),
    gymName: toStringOrNull(data.gymName) ?? toStringOrNull(data.tenantName) ?? toStringOrNull(gym?.name),
    role: normalize(toStringOrNull(data.role)),
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

  const [membership, setMembership] = useState<GymMembership>(defaultMembership);
  const [gyms, setGyms] = useState<GymItem[]>([]);
  const [selectedGymId, setSelectedGymId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestingJoin, setRequestingJoin] = useState(false);
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [gymsLoading, setGymsLoading] = useState(false);
  const [gymsLoadError, setGymsLoadError] = useState(false);
  const [gymsUnsupported, setGymsUnsupported] = useState(false);
  const [joinRequestUnsupported, setJoinRequestUnsupported] = useState(false);
  const [joinCodeUnsupported, setJoinCodeUnsupported] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  const canOpenAdmin = useMemo(
    () => membership.status === "ACTIVE" && (membership.role === "ADMIN" || membership.role === "TRAINER"),
    [membership.role, membership.status],
  );

  const loadGyms = useCallback(async () => {
    setGymsLoading(true);
    setGymsLoadError(false);
    setGymsUnsupported(false);

    try {
      const gymsRes = await fetch("/api/gyms", { cache: "no-store", credentials: "include" });

      if (!gymsRes.ok) {
        if (gymsRes.status === 404 || gymsRes.status === 405) {
          setGymsUnsupported(true);
          setGyms([]);
          setSelectedGymId("");
          return;
        }
        if (gymsRes.status === 401) {
          setIsSessionExpired(true);
        }
        setGyms([]);
        setSelectedGymId("");
        setGymsLoadError(gymsRes.status !== 401);
        return;
      }

      const gymsData = readGyms(await gymsRes.json());
      setGyms(gymsData);
      setSelectedGymId((current) => current || gymsData[0]?.id || "");
    } catch {
      setGyms([]);
      setSelectedGymId("");
      setGymsLoadError(true);
    } finally {
      setGymsLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    setIsSessionExpired(false);

    try {
      const membershipRes = await fetch("/api/gym/me", { cache: "no-store", credentials: "include" });

      if (membershipRes.status === 404 || membershipRes.status === 405) {
        const legacyMembershipRes = await fetch("/api/gyms/membership", { cache: "no-store", credentials: "include" });
        if (legacyMembershipRes.ok) {
          const membershipData = readMembership(await legacyMembershipRes.json());
          setMembership(membershipData);
          if (membershipData.status === "NONE" || membershipData.status === "REJECTED") {
            await loadGyms();
          }
          return;
        }
        setMembership(defaultMembership);
        return;
      }

      if (membershipRes.status === 401) {
        setMembership(defaultMembership);
        setGyms([]);
        setSelectedGymId("");
        setIsSessionExpired(true);
        return;
      }

      if (!membershipRes.ok) {
        throw new Error("membership");
      }

      const membershipData = readMembership(await membershipRes.json());
      setMembership(membershipData);

      if (membershipData.status === "NONE" || membershipData.status === "REJECTED") {
        await loadGyms();
      } else {
        setGyms([]);
        setSelectedGymId("");
      }
    } catch {
      setError(t("gym.loadError.subtitle"));
    } finally {
      setLoading(false);
    }
  }, [loadGyms, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const requestJoin = async () => {
    if (!selectedGymId) return;

    setRequestingJoin(true);
    setActionError(null);

    try {
      const response = await fetch("/api/gym/join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gymId: selectedGymId }),
      });

      if (response.status === 404 || response.status === 405) {
        setJoinRequestUnsupported(true);
        return;
      }

      if (!response.ok) throw new Error("join");
      await loadData();
    } catch {
      setActionError(t("gym.actionError"));
    } finally {
      setRequestingJoin(false);
    }
  };

  const joinUsingCode = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    setJoiningByCode(true);
    setActionError(null);

    try {
      const response = await fetch("/api/gym/join-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: trimmedCode }),
      });

      if (response.status === 404 || response.status === 405) {
        setJoinCodeUnsupported(true);
        return;
      }

      if (!response.ok) throw new Error("join-by-code");
      setCode("");
      await loadData();
    } catch {
      setActionError(t("gym.actionError"));
    } finally {
      setJoiningByCode(false);
    }
  };

  if (loading) {
    return (
      <section className="card">
        <Skeleton variant="line" className="w-45" />
        <Skeleton variant="line" className="w-70" />
        <p className="muted">{t("common.loading")}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card status-card status-card--warning">
        <strong>{t("gym.loadError.title")}</strong>
        <p className="muted">{error}</p>
        <Button variant="secondary" onClick={() => void loadData()}>
          {t("common.retry")}
        </Button>
      </section>
    );
  }

  if (isSessionExpired) {
    return (
      <section className="card status-card status-card--warning">
        <strong>{t("gym.sessionExpired.title")}</strong>
        <p className="muted">{t("gym.sessionExpired.subtitle")}</p>
        <ButtonLink href="/login">{t("nav.login")}</ButtonLink>
      </section>
    );
  }

  return (
    <div className="page form-stack">
      <section className="card">
        <h1 className="section-title">{t("gym.title")}</h1>
        <p className="section-subtitle">{t("gym.description")}</p>
      </section>

      {(membership.status === "NONE" || membership.status === "REJECTED") && (
        <>
          <section className="card form-stack">
            <h2 className="section-title section-title-sm">{t("gym.membership.none.title")}</h2>
            {gymsLoading ? (
              <p className="muted">{t("common.loading")}</p>
            ) : gymsLoadError ? (
              <div className="form-stack">
                <p className="muted">{t("gym.join.loadError")}</p>
                <Button variant="secondary" onClick={() => void loadGyms()}>
                  {t("common.retry")}
                </Button>
              </div>
            ) : gymsUnsupported ? (
              <p className="muted">{t("gym.unavailableDescription")}</p>
            ) : gyms.length === 0 ? (
              <p className="muted">{t("gym.join.empty")}</p>
            ) : (
              <label className="form-stack">
                {t("gym.join.selectLabel")}
                <select value={selectedGymId} onChange={(event) => setSelectedGymId(event.target.value)}>
                  {gyms.map((gym) => (
                    <option key={gym.id} value={gym.id}>
                      {gym.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Button onClick={() => void requestJoin()} disabled={requestingJoin || joinRequestUnsupported || !selectedGymId || gyms.length === 0 || gymsLoading}>
              {requestingJoin ? t("common.loading") : t("gym.join.requestButton")}
            </Button>
            {joinRequestUnsupported ? <p className="muted">{t("gym.unavailableDescription")}</p> : null}
          </section>

          <section className="card form-stack">
            <label className="form-stack">
              {t("gym.join.codeLabel")}
              <input value={code} onChange={(event) => setCode(event.target.value)} />
            </label>
            <p className="section-subtitle">{t("gym.join.codeHelp")}</p>
            <Button onClick={() => void joinUsingCode()} disabled={joiningByCode || joinCodeUnsupported || !code.trim()}>
              {joiningByCode ? t("common.loading") : t("gym.join.codeButton")}
            </Button>
            {joinCodeUnsupported ? <p className="muted">{t("gym.unavailableDescription")}</p> : null}
          </section>
        </>
      )}

      {membership.status === "PENDING" && (
        <section className="card status-card">
          <strong>{t("gym.membership.pending.title")}</strong>
          <p className="muted">{t("gym.membership.pending.description", { gymName: membership.gymName ?? "-" })}</p>
        </section>
      )}

      {membership.status === "ACTIVE" && (
        <section className="card status-card">
          <strong>{t("gym.membership.active.title")}</strong>
          <p className="muted">{t("gym.membership.active.description", { gymName: membership.gymName ?? "-", role: membership.role ?? "-" })}</p>
          <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
            <ButtonLink href="/app/entrenamiento">{t("gym.membership.active.planButton")}</ButtonLink>
            {canOpenAdmin && (
              <Link href="/app/gym/admin" className="btn secondary fit-content">
                {t("gym.admin.goToPanel")}
              </Link>
            )}
          </div>
        </section>
      )}

      {membership.status === "REJECTED" && (
        <section className="card status-card status-card--warning">
          <strong>{t("gym.membership.rejected.title")}</strong>
          <p className="muted">{t("gym.membership.rejected.description")}</p>
        </section>
      )}

      {membership.status === "UNKNOWN" && (
        <section className="card status-card status-card--warning">
          <strong>{t("gym.unavailableTitle")}</strong>
          <p className="muted">{t("gym.unavailableDescription")}</p>
        </section>
      )}

      {actionError && (
        <section className="card status-card status-card--warning">
          <strong>{t("gym.actionErrorTitle")}</strong>
          <p className="muted">{actionError}</p>
        </section>
      )}
    </div>
  );
}
