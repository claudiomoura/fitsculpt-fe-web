"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { EmptyState, ErrorState } from "@/components/states";
import { GymCard } from "@/components/gym/GymCard";
import { GymListSkeleton } from "@/components/gym/GymListSkeleton";
import { MembershipStatusBadge } from "@/components/gym/MembershipStatusBadge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  fetchGymsList,
  fetchMyGymMembership,
  gymServiceCapabilities,
  leaveGymMembership,
  requestGymJoin,
  type GymListItem,
  type GymMembership,
} from "@/services/gym";

type MembershipStatus = "NONE" | "PENDING" | "ACTIVE" | "REJECTED";

const defaultMembership: GymMembership = {
  status: "NONE",
  gymId: null,
  gymName: null,
  role: null,
};

export default function GymPageClient() {
  const { t } = useLanguage();

  const [membership, setMembership] = useState<GymMembership>(defaultMembership);
  const [gyms, setGyms] = useState<GymListItem[]>([]);
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
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isLeavingGym, setIsLeavingGym] = useState(false);

  const canOpenAdmin = useMemo(
    () => membership.status === "ACTIVE" && (membership.role === "ADMIN" || membership.role === "TRAINER"),
    [membership.role, membership.status],
  );

  const isMembershipPending = membership.status === "PENDING";
  const isMembershipActive = membership.status === "ACTIVE";
  const shouldDisableJoinActions = requestingJoin || gymsLoading || joinRequestUnsupported || isMembershipPending || isMembershipActive;

  const loadGyms = useCallback(async () => {
    setGymsLoading(true);
    setGymsLoadError(false);

    try {
      const gymsResponse = await fetchGymsList();
      if (!gymsResponse.ok) {
        if (gymsResponse.reason === "unauthorized") {
          setIsSessionExpired(true);
          setGyms([]);
          setSelectedGymId("");
          setGymsLoadError(false);
          return;
        }

        setGyms([]);
        setSelectedGymId("");
        setGymsLoadError(true);
        return;
      }

      setGyms(gymsResponse.data);
      setSelectedGymId((current) => current || gymsResponse.data[0]?.id || "");
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
      const membershipRes = await fetchMyGymMembership();

      if (!membershipRes.ok && membershipRes.reason === "unauthorized") {
        setMembership(defaultMembership);
        setGyms([]);
        setSelectedGymId("");
        setIsSessionExpired(true);
        return;
      }

      if (!membershipRes.ok) {
        throw new Error("membership");
      }

      setMembership(membershipRes.data);
      await loadGyms();
    } catch (_err) {
      setError(t("gym.loadError.subtitle"));
    } finally {
      setLoading(false);
    }
  }, [loadGyms, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const requestJoin = async () => {
    if (!selectedGymId || shouldDisableJoinActions) return;

    setRequestingJoin(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await requestGymJoin(selectedGymId);

      if (!response.ok && response.reason === "unsupported") {
        setJoinRequestUnsupported(true);
        return;
      }

      if (!response.ok) {
        setActionError(response.message || t("gym.actionError"));
        return;
      }

      setActionSuccess(t("gym.join.requestSuccess"));
      await loadData();
    } catch (_err) {
      setActionError(t("gym.actionError"));
    } finally {
      setRequestingJoin(false);
    }
  };

  const handleLeaveGym = async () => {
    if (isLeavingGym) return;

    setIsLeavingGym(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await leaveGymMembership();
      if (!response.ok && response.reason === "unsupported") {
        setActionError(t("gym.leave.unsupported"));
        return;
      }
      if (!response.ok) {
        setActionError(response.message || t("gym.leave.error"));
        return;
      }

      setActionSuccess(t("gym.leave.success"));
      setIsLeaveConfirmOpen(false);
      await loadData();
    } catch (_err) {
      setActionError(t("gym.leave.error"));
    } finally {
      setIsLeavingGym(false);
    }
  };

  const joinUsingCode = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode || isMembershipPending || isMembershipActive) return;

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
        const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
        if (payload?.error === "INVALID_GYM_CODE") {
          setActionError(t("gym.join.invalidCode"));
          return;
        }
        setActionError(payload?.message || t("gym.actionError"));
        return;
      }
      setCode("");
      setActionSuccess(t("gym.join.codeSuccess"));
      await loadData();
    } catch (_err) {
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

      <section className="form-stack" aria-label={t("gym.join.directoryTitle")}>
        <h2 className="section-title section-title-sm">{t("gym.join.directoryTitle")}</h2>
        {gymsLoading ? (
          <GymListSkeleton count={2} />
        ) : gymsLoadError ? (
          <ErrorState title={t("gym.join.loadErrorTitle")} description={t("gym.join.loadError")} retryLabel={t("common.retry")} onRetry={() => void loadGyms()} />
        ) : gyms.length === 0 ? (
          <EmptyState
            title={t("gym.join.emptyTitle")}
            description={t("gym.join.empty")}
            actions={[{ label: t("common.retry"), onClick: () => void loadGyms(), variant: "secondary" }]}
          />
        ) : (
          gyms.map((gym) => {
            const safeStatus: MembershipStatus =
              membership.gymId && membership.gymId === gym.id && (membership.status === "PENDING" || membership.status === "ACTIVE")
                ? membership.status
                : "NONE";

            return (
              <GymCard
                key={gym.id}
                id={gym.id}
                name={gym.name}
                membershipStatus={safeStatus}
                isSelected={selectedGymId === gym.id}
                disabled={shouldDisableJoinActions}
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
        {isMembershipPending ? <p className="muted">{t("gym.join.requestPending")}</p> : null}
      </section>

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
              {gymServiceCapabilities.supportsLeaveGym ? (
                <Button
                  variant="secondary"
                  onClick={() => setIsLeaveConfirmOpen(true)}
                  disabled={isLeavingGym}
                  loading={isLeavingGym}
                >
                  {t("gym.leave.cta")}
                </Button>
              ) : null}
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

      {!isMembershipPending && !isMembershipActive ? (
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
      ) : null}

      {gymServiceCapabilities.supportsLeaveGym ? (
        <Modal
          open={isLeaveConfirmOpen}
          onClose={() => {
            if (isLeavingGym) return;
            setIsLeaveConfirmOpen(false);
          }}
          title={t("gym.leave.confirmTitle")}
          description={t("gym.leave.confirmDescription")}
          footer={
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <Button variant="secondary" onClick={() => setIsLeaveConfirmOpen(false)} disabled={isLeavingGym}>
                {t("ui.cancel")}
              </Button>
              <Button onClick={() => void handleLeaveGym()} loading={isLeavingGym} disabled={isLeavingGym}>
                {t("gym.leave.confirmAction")}
              </Button>
            </div>
          }
        >
          <p className="muted" style={{ margin: 0 }}>{t("gym.leave.confirmHelp")}</p>
        </Modal>
      ) : null}

      {actionError ? <ErrorState title={t("gym.actionErrorTitle")} description={actionError} retryLabel={t("common.retry")} onRetry={() => setActionError(null)} /> : null}
      {actionSuccess ? <EmptyState title={t("gym.actionSuccessTitle")} description={actionSuccess} /> : null}
    </div>
  );
}
