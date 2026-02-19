"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { GymCard } from "@/components/gym/GymCard";
import { GymListSkeleton } from "@/components/gym/GymListSkeleton";
import { MembershipStatusBadge } from "@/components/gym/MembershipStatusBadge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
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

function emitGymMembershipRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("gym-membership:refresh"));
  window.dispatchEvent(new Event("auth:refresh"));
}

export default function GymPageClient() {
  const { t } = useLanguage();
  const { notify } = useToast();

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
  const isMembershipNone = membership.status === "NONE";
  const shouldDisableJoinActions = requestingJoin || gymsLoading || joinRequestUnsupported || isMembershipPending || isMembershipActive;
  const isActionsDisabled = isMembershipPending || isMembershipActive || (joinRequestUnsupported && joinCodeUnsupported);

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
        const message = response.message || t("gym.actionError");
        setActionError(message);
        notify({ title: t("common.error"), description: message, variant: "error" });
        return;
      }

      setActionSuccess(t("gym.join.requestSuccess"));
      notify({ title: t("common.success"), description: t("gym.join.requestSuccess"), variant: "success" });
      await loadData();
      emitGymMembershipRefresh();
    } catch (_err) {
      setActionError(t("gym.actionError"));
      notify({ title: t("common.error"), description: t("gym.actionError"), variant: "error" });
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
        notify({ title: t("common.error"), description: t("gym.leave.unsupported"), variant: "error" });
        return;
      }
      if (!response.ok) {
        const message = response.message || t("gym.leave.error");
        setActionError(message);
        notify({ title: t("common.error"), description: message, variant: "error" });
        return;
      }

      setActionSuccess(t("gym.leave.success"));
      notify({ title: t("common.success"), description: t("gym.leave.success"), variant: "success" });
      setIsLeaveConfirmOpen(false);
      await loadData();
      emitGymMembershipRefresh();
    } catch (_err) {
      setActionError(t("gym.leave.error"));
      notify({ title: t("common.error"), description: t("gym.leave.error"), variant: "error" });
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
          notify({ title: t("common.error"), description: t("gym.join.invalidCode"), variant: "error" });
          return;
        }
        const message = payload?.message || t("gym.actionError");
        setActionError(message);
        notify({ title: t("common.error"), description: message, variant: "error" });
        return;
      }
      setCode("");
      setActionSuccess(t("gym.join.codeSuccess"));
      notify({ title: t("common.success"), description: t("gym.join.codeSuccess"), variant: "success" });
      await loadData();
      emitGymMembershipRefresh();
    } catch (_err) {
      setActionError(t("gym.actionError"));
      notify({ title: t("common.error"), description: t("gym.actionError"), variant: "error" });
    } finally {
      setJoiningByCode(false);
    }
  };

  if (loading) {
    return <LoadingState ariaLabel={t("gym.member.loading")} title={t("gym.member.loading")} showCard={false} lines={4} />;
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

      <section className="form-stack" aria-label={t("gym.sections.currentStatus")}>
        <h2 className="section-title section-title-sm">{t("gym.sections.currentStatus")}</h2>

        {isMembershipNone ? (
          <EmptyState title={t("gym.membership.none.title")} description={t("gym.sections.currentStatusHelp")} wrapInCard />
        ) : null}

        {membership.status === "PENDING" && (
          <Card>
            <CardHeader className="gym-header-row">
              <CardTitle>{t("gym.membership.pending.title")}</CardTitle>
              <MembershipStatusBadge
              status={membership.status}
              pendingLabel={t("gym.membership.pending.badge")}
              activeLabel={t("gym.membership.active.badge")}
              unknownLabel={t("gym.membership.unknown.badge")}
              />
            </CardHeader>
            <CardContent>
              <CardDescription>{t("gym.membership.pending.description", { gymName: membership.gymName ?? t("common.notAvailable") })}</CardDescription>
            </CardContent>
          </Card>
        )}

        {membership.status === "ACTIVE" && (
          <Card>
            <CardHeader className="gym-header-row">
              <CardTitle>{t("gym.membership.active.title")}</CardTitle>
              <MembershipStatusBadge
              status={membership.status}
              pendingLabel={t("gym.membership.pending.badge")}
              activeLabel={t("gym.membership.active.badge")}
              unknownLabel={t("gym.membership.unknown.badge")}
              />
            </CardHeader>
            <CardContent className="form-stack">
              <CardDescription>
                {t("gym.membership.active.description", {
                  gymName: membership.gymName ?? t("common.notAvailable"),
                  role: membership.role ?? t("common.notAvailable"),
                })}
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {membership.status === "REJECTED" ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("gym.membership.rejected.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{t("gym.membership.rejected.description")}</CardDescription>
            </CardContent>
          </Card>
        ) : null}
      </section>

      <section className="form-stack" aria-label={t("gym.sections.actions")}>
        <h2 className="section-title section-title-sm">{t("gym.sections.actions")}</h2>

        {isActionsDisabled ? <EmptyState title={t("gym.sections.disabledTitle")} description={t("gym.sections.disabledDescription")} wrapInCard /> : null}

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
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{t("gym.actions.membershipTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gym-actions-row">
              {isMembershipActive ? <ButtonLink href="/app/entrenamiento">{t("gym.membership.active.planButton")}</ButtonLink> : null}
              {canOpenAdmin ? (
                <Link href="/app/gym/admin" className="btn secondary fit-content">
                  {t("gym.admin.goToPanel")}
                </Link>
              ) : null}
              {gymServiceCapabilities.supportsLeaveGym ? (
                <Button
                  variant="secondary"
                  onClick={() => setIsLeaveConfirmOpen(true)}
                  disabled={!isMembershipActive || isLeavingGym}
                  loading={isLeavingGym}
                >
                  {t("gym.leave.cta")}
                </Button>
              ) : null}
            </div>
            {joinRequestUnsupported || joinCodeUnsupported ? <p className="muted">{t("gym.unavailableDescription")}</p> : null}
          </CardContent>
        </Card>
      </section>

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
            <div className="gym-modal-footer">
              <Button variant="secondary" onClick={() => setIsLeaveConfirmOpen(false)} disabled={isLeavingGym}>
                {t("ui.cancel")}
              </Button>
              <Button onClick={() => void handleLeaveGym()} loading={isLeavingGym} disabled={isLeavingGym}>
                {t("gym.leave.confirmAction")}
              </Button>
            </div>
          }
        >
          <p className="muted m-0">{t("gym.leave.confirmHelp")}</p>
        </Modal>
      ) : null}

      {actionError ? <ErrorState title={t("gym.actionErrorTitle")} description={actionError} retryLabel={t("common.retry")} onRetry={() => setActionError(null)} /> : null}
      {actionSuccess ? <EmptyState title={t("gym.actionSuccessTitle")} description={actionSuccess} /> : null}
    </div>
  );
}
