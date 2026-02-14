"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { ButtonLink } from "@/components/ui/Button";

type ProfilePayload = {
  gymId?: string;
  tenantId?: string;
  gymMembershipStatus?: string;
  membershipStatus?: string;
  gymRole?: string;
  membershipRole?: string;
  tenant?: {
    id?: string;
    gymId?: string;
    tenantId?: string;
    gymMembershipStatus?: string;
    membershipStatus?: string;
    status?: string;
    gymRole?: string;
    membershipRole?: string;
    role?: string;
  } | string;
};

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : null;
}

function isActiveMember(profile: ProfilePayload | null) {
  if (!profile) return false;
  const tenant = typeof profile.tenant === "object" && profile.tenant ? profile.tenant : null;
  const status =
    normalize(profile.gymMembershipStatus) ??
    normalize(profile.membershipStatus) ??
    normalize(tenant?.gymMembershipStatus) ??
    normalize(tenant?.membershipStatus) ??
    normalize(tenant?.status);
  const role =
    normalize(profile.gymRole) ??
    normalize(profile.membershipRole) ??
    normalize(tenant?.gymRole) ??
    normalize(tenant?.membershipRole) ??
    normalize(tenant?.role);
  return status === "ACTIVE" && role === "MEMBER";
}

export default function GymPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [showPlanCta, setShowPlanCta] = useState(false);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      const response = await fetch("/api/profile", { cache: "no-store", credentials: "include" });
      if (!response.ok) {
        if (active) setLoading(false);
        return;
      }
      const profile = (await response.json()) as ProfilePayload;
      if (active) {
        setShowPlanCta(isActiveMember(profile));
        setLoading(false);
      }
    };
    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page form-stack">
      <section className="card">
        <h1 className="section-title">{t("gym.title")}</h1>
        <p className="section-subtitle">{t("gym.member.subtitle")}</p>
      </section>

      {loading ? <p className="muted">{t("gym.member.loading")}</p> : null}
      {!loading && showPlanCta ? (
        <section className="card">
          <h2 className="section-title" style={{ fontSize: 18 }}>{t("gym.member.planTitle")}</h2>
          <p className="section-subtitle">{t("gym.member.planDescription")}</p>
          <ButtonLink href="/app/entrenamiento">{t("gym.member.planCta")}</ButtonLink>
        </section>
      ) : null}
    </div>
  );
}
