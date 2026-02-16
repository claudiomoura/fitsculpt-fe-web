"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/gym/EmptyState";
import { ErrorState } from "@/components/gym/ErrorState";
import { GymCard } from "@/components/gym/GymCard";
import { GymListSkeleton } from "@/components/gym/GymListSkeleton";
import { MembershipStatusBadge } from "@/components/gym/MembershipStatusBadge";

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
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [gymsLoading, setGymsLoading] = useState(false);
  const [gymsLoadError, setGymsLoadError] = useState(false);
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

    try {
      const gymsRes = await fetch("/api/gyms", { cache: "no-store", credentials: "include" });

      if (!gymsRes.ok) {
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
    setActionSuccess(null);
    setIsSessionExpired(false);

    try {
      const membershipRes = await fetch("/api/gym/me", { cache: "no-store", credentials: "include" });

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
    setActionSuccess(null);

    try {
      let response = await fetch("/api/gym/join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gymId: selectedGymId }),
      });

      if (response.status === 404 || response.status === 405) {
        response = await fetch("/api/gyms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ gymId: selectedGymId }),
        });
      }

      if (response.status === 404 || response.status === 405) {
        setJoinRequestUnsupported(true);
        return;
      }

      if (!response.ok) throw new Error("join");
      setActionSuccess(t("gym.join.requestSuccess"));
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
    setActionSuccess(null);

    try {
      let response = await fetch("/api/gym/join-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: trimmedCode }),
      });

      if (response.status === 404 || response.status === 405) {
        response = await fetch("/api/gyms/join-by-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code: trimmedCode }),
        });
      }

      if (response.status === 404 || response.status === 405) {
        setJoinCodeUnsupported(true);
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (payload?.error === "INVALID_GYM_CODE") {
          setActionError(t("gym.join.invalidCode"));
          return;
        }
        throw new Error("join-by-code");
      }
      setCode("");
      setActionSuccess(t("gym.join.codeSuccess"));
      await loadData();
    } catch {
      setActionError(t("gym.actionError"));
    } finally {
      setJoiningByCode(false);
    }
  };

  if (loading) {
    return <GymListSkeleton />;
  }

  if (error) {
    return <ErrorState title={t("gym.loadError.title")} description={error} retryLabel={t("common.retry")} onRetry={() => void loadData()} />;
  }

  if (isSessionExpired) {
    return (
      <ErrorState
        title={t("gym.sessionExpired.title")}
        description={t("gym.sessionExpired.subtitle")}
        retryLabel={t("nav.login")}
        onRetry={() => {
          window.location.href = "/login";
        }}
      />
    );
  }

  return (
    <div className="page form-stack">
      <Card>
        <CardHeader>
          <CardTitle>{t("gym.title")}</CardTitle>
          <CardDescription>{t("gym.description")}</CardDescription>
        </CardHeader>
      </Card>

      {(membership.status === "NONE" || membership.status === "REJECTED") && (
        <section className="form-stack" aria-label={t("gym.join.directoryTitle")}>
          <h2 className="section-title section-title-sm">{t("gym.join.directoryTitle")}</h2>
          {gymsLoading ? (
            <GymListSkeleton count={2} />
          ) : gymsLoadError ? (
            <ErrorState title={t("gym.join.loadErrorTitle")} description={t("gym.join.loadError")} retryLabel={t("common.retry")} onRetry={() => void loadGyms()} />
          ) : gyms.length === 0 ? (
            <EmptyState title={t("gym.join.emptyTitle")} description={t("gym.join.empty")} />
          ) : (
            gyms.map((gym) => {
              const safeStatus: MembershipStatus =
                membership.gymId && membership.gymId === gym.id && (membership.status === "PENDING" || membership.status === "ACTIVE")
                  ? membership.status
                  : "UNKNOWN";

              return (
                <GymCard
                  key={gym.id}
                  id={gym.id}
                  name={gym.name}
                  membershipStatus={safeStatus}
                  isSelected={selectedGymId === gym.id}
                  disabled={requestingJoin || gymsLoading || joinRequestUnsupported}
                  onSelect={setSelectedGymId}
                  onRequestJoin={() => void requestJoin()}
                  statusLabels={{
                    pending: t("gym.membership.pending.badge"),
                    active: t("gym.membership.active.badge"),
                    fallback: t("gym.membership.unknown.badge"),
                  }}
                  selectLabel={t("gym.join.selectButton")}
                  requestLabel={t("gym.join.requestButton")}
                  pendingRequestLabel={t("gym.join.requestPending")}
                />
              );
            })
          )}
          {joinRequestUnsupported ? <p className="muted">{t("gym.unavailableDescription")}</p> : null}
        </section>
      )}

      {membership.status === "PENDING" && (
        <Card>
          <CardHeader className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
            <CardTitle>{t("gym.membership.pending.title")}</CardTitle>
            <MembershipStatusBadge
              status={membership.status}
              pendingLabel={t("gym.membership.pending.badge")}
              activeLabel={t("gym.membership.active.badge")}
              unknownLabel={t("gym.membership.unknown.badge")}
            />
          </CardHeader>
          <CardContent>
            <CardDescription>{t("gym.membership.pending.description", { gymName: membership.gymName ?? "-" })}</CardDescription>
          </CardContent>
        </Card>
      )}

      {membership.status === "ACTIVE" && (
        <Card>
          <CardHeader className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
            <CardTitle>{t("gym.membership.active.title")}</CardTitle>
            <MembershipStatusBadge
              status={membership.status}
              pendingLabel={t("gym.membership.pending.badge")}
              activeLabel={t("gym.membership.active.badge")}
              unknownLabel={t("gym.membership.unknown.badge")}
            />
          </CardHeader>
          <CardContent className="form-stack">
            <CardDescription>{t("gym.membership.active.description", { gymName: membership.gymName ?? "-", role: membership.role ?? "-" })}</CardDescription>
            <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
              <ButtonLink href="/app/entrenamiento">{t("gym.membership.active.planButton")}</ButtonLink>
              {canOpenAdmin && (
                <Link href="/app/gym/admin" className="btn secondary fit-content">
                  {t("gym.admin.goToPanel")}
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {membership.status === "REJECTED" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("gym.membership.rejected.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>{t("gym.membership.rejected.description")}</CardDescription>
          </CardContent>
        </Card>
      )}

      {membership.status === "UNKNOWN" && <EmptyState title={t("gym.unavailableTitle")} description={t("gym.unavailableDescription")} />}

      <Card>
        <CardHeader>
          <CardTitle>{t("gym.join.codeTitle")}</CardTitle>
          <CardDescription>{t("gym.join.codeHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="form-stack">
          <label className="form-stack" htmlFor="gym-join-code">
            {t("gym.join.codeLabel")}
            <input id="gym-join-code" value={code} onChange={(event) => setCode(event.target.value)} />
          </label>
          <Button onClick={() => void joinUsingCode()} disabled={joiningByCode || joinCodeUnsupported || !code.trim()}>
            {joiningByCode ? t("common.loading") : t("gym.join.codeButton")}
          </Button>
          {joinCodeUnsupported ? <p className="muted">{t("gym.unavailableDescription")}</p> : null}
        </CardContent>
      </Card>

      {actionError ? <ErrorState title={t("gym.actionErrorTitle")} description={actionError} retryLabel={t("common.retry")} onRetry={() => setActionError(null)} /> : null}
      {actionSuccess ? <EmptyState title={t("gym.actionSuccessTitle")} description={actionSuccess} /> : null}
    </div>
  );
}
