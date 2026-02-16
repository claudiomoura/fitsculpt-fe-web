"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";
import TrainerPlanAssignmentPanel from "@/components/trainer/TrainerPlanAssignmentPanel";
import { fetchGymMembershipStatus, parseGymMembership, type GymMembership } from "@/services/gym";

type MembershipViewState = "loading" | "ready";
type MembershipGate = "in_gym" | "not_in_gym" | "unknown" | "no_permission";

const unknownMembership: GymMembership = {
  status: "UNKNOWN",
  gymId: null,
  gymName: null,
  role: null,
};

export default function TrainerHomeClient() {
  const { t } = useLanguage();
  const { isCoach, isAdmin, isLoading: accessLoading } = useAccess();
  const [membershipViewState, setMembershipViewState] = useState<MembershipViewState>("loading");
  const [membershipGate, setMembershipGate] = useState<MembershipGate>("unknown");
  const [membership, setMembership] = useState<GymMembership>(unknownMembership);

  useEffect(() => {
    let active = true;

    const loadMembership = async () => {
      setMembershipViewState("loading");
      try {
        const response = await fetchGymMembershipStatus();

        if (response.status === 403) {
          if (!active) return;
          setMembershipGate("no_permission");
          setMembership(unknownMembership);
          setMembershipViewState("ready");
          return;
        }

        if (!response.ok) {
          if (!active) return;
          setMembershipGate(response.status === 401 ? "no_permission" : "unknown");
          setMembership(unknownMembership);
          setMembershipViewState("ready");
          return;
        }

        const parsedMembership = parseGymMembership(await response.json());
        if (!active) return;

        setMembership(parsedMembership);
        if (parsedMembership.status === "ACTIVE") {
          setMembershipGate("in_gym");
        } else if (parsedMembership.status === "NONE" || parsedMembership.status === "REJECTED") {
          setMembershipGate("not_in_gym");
        } else {
          setMembershipGate("unknown");
        }
        setMembershipViewState("ready");
      } catch {
        if (!active) return;
        setMembershipGate("unknown");
        setMembership(unknownMembership);
        setMembershipViewState("ready");
      }
    };

    void loadMembership();

    return () => {
      active = false;
    };
  }, []);

  const canAccessTrainer = useMemo(
    () => membershipGate === "in_gym" && (isCoach || isAdmin),
    [isAdmin, isCoach, membershipGate],
  );

  if (accessLoading || membershipViewState === "loading") {
    return <LoadingState ariaLabel={t("trainer.loading")} lines={2} />;
  }

  if (!canAccessTrainer) {
    if (membershipGate === "not_in_gym") {
      return <EmptyState title={t("trainer.gymRequiredTitle")} description={t("trainer.gymRequiredDesc")} wrapInCard icon="info" />;
    }

    if (membershipGate === "unknown") {
      return <EmptyState title={t("trainer.gymUnknownTitle")} description={t("trainer.gymUnknownDesc")} wrapInCard icon="info" />;
    }

    return <EmptyState title={t("trainer.unauthorized")} wrapInCard icon="warning" />;
  }

  return (
    <div className="form-stack">
      <div className="feature-card form-stack">
        <h2 style={{ margin: 0 }}>{t("trainer.modeTitle")}</h2>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.viewingAsCoach")}</p>
        {membership.gymName ? <p className="muted" style={{ margin: 0 }}>{membership.gymName}</p> : null}
      </div>

      <section className="card form-stack" aria-labelledby="trainer-clients-title">
        <h2 id="trainer-clients-title" className="section-title" style={{ fontSize: 20 }}>
          {t("trainer.clients.title")}
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          {t("trainer.clients.description")}
        </p>
        <Link href="/app/trainer/clients" className="btn secondary fit-content">
          {t("trainer.clients.openList")}
        </Link>
      </section>

      <section className="card form-stack" aria-labelledby="trainer-athlete-context-title">
        <h3 id="trainer-athlete-context-title" style={{ margin: 0 }}>
          {t("trainer.clientContext.title")}
        </h3>
        <p className="muted" style={{ margin: 0 }}>
          {t("trainer.clientContext.nextStep")}
        </p>
      </section>

      <TrainerPlanAssignmentPanel />
    </div>
  );
}
