"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { defaultProfile, type ProfileData } from "@/lib/profile";
import { getUserProfile } from "@/lib/profileService";
import { isTrainer as isTrainerRole } from "@/lib/roles";
import { extractGymMembership, type GymMembership } from "@/lib/gymMembership";
import TrainerProfileSummary from "@/components/trainer/profile/TrainerProfileSummary";
import { ButtonLink } from "@/components/ui/Button";
import styles from "./ProfileSummaryClient.module.css";

type AuthState = {
  name: string | null;
  email: string | null;
  plan: string | null;
};

const UNKNOWN_MEMBERSHIP: GymMembership = { state: "unknown", gymId: null, gymName: null };

function normalizePlanLabel(plan: string | null): string {
  if (!plan) return "Free";
  return plan
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function localeLabel(locale: string) {
  if (locale === "es") return "Español";
  if (locale === "en") return "English";
  if (locale === "pt") return "Português";
  return locale;
}

export default function ProfileSummaryClient() {
  const { t, locale } = useLanguage();
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [auth, setAuth] = useState<AuthState>({ name: null, email: null, plan: null });
  const [isTrainer, setIsTrainer] = useState(false);
  const [gymMembership, setGymMembership] = useState<GymMembership>(UNKNOWN_MEMBERSHIP);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [profileData, authResponse] = await Promise.all([
          getUserProfile(),
          fetch("/api/auth/me", { cache: "no-store", credentials: "include" }),
        ]);

        if (!active) return;

        setProfile(profileData);

        if (authResponse.ok) {
          const authData = (await authResponse.json()) as {
            name?: string | null;
            email?: string | null;
            subscriptionPlan?: string | null;
            plan?: string | null;
            entitlements?: { plan?: { effective?: string | null } | null } | null;
          };
          setAuth({
            name: authData.name ?? null,
            email: authData.email ?? null,
            plan: authData.entitlements?.plan?.effective ?? authData.subscriptionPlan ?? authData.plan ?? null,
          });
          setIsTrainer(isTrainerRole(authData));
          setGymMembership(extractGymMembership(authData));
        }
      } catch (_error) {
        if (!active) return;
        setProfile(defaultProfile);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const goalLabel = useMemo(() => {
    if (!profile.goal) return t("profile.noData");
    if (profile.goal === "cut") return t("profile.goalCut");
    if (profile.goal === "bulk") return t("profile.goalBulk");
    return t("profile.goalMaintain");
  }, [profile.goal, t]);

  const levelLabel = useMemo(() => {
    if (!profile.trainingPreferences.level) return t("profile.noData");
    if (profile.trainingPreferences.level === "beginner") return t("profile.trainingLevelBeginner");
    if (profile.trainingPreferences.level === "intermediate") return t("profile.trainingLevelIntermediate");
    return t("profile.trainingLevelAdvanced");
  }, [profile.trainingPreferences.level, t]);

  if (isTrainer) {
    return <TrainerProfileSummary profile={profile} loading={false} t={t} gymMembership={gymMembership} />;
  }

  const displayName = auth.name ?? profile.name ?? t("profile.noData");
  const displayEmail = auth.email ?? t("profile.noData");

  return (
    <div className={styles.stack}>
      <section className={`card ${styles.userCard}`}>
        <p className={styles.userName}>{displayName}</p>
        <p className={styles.userEmail}>{displayEmail}</p>
      </section>

      <section className={`card ${styles.planCard}`}>
        <div>
          <p className={styles.planLabel}>{t("nav.billing")}</p>
          <p className={styles.planName}>{normalizePlanLabel(auth.plan)}</p>
        </div>
        <ButtonLink href="/app/settings/billing" size="sm">
          {t("ui.edit")}
        </ButtonLink>
      </section>

      <section className="card">
        <h3 className={styles.groupTitle}>{t("nav.trainingPlan")}</h3>
        <div className={styles.rows}>
          <HubRow label={t("profile.goal")} value={goalLabel} href="/app/onboarding" />
          <HubRow label={t("profile.trainingLevel")} value={levelLabel} href="/app/onboarding" />
        </div>
      </section>

      <section className="card">
        <h3 className={styles.groupTitle}>{t("profile.preferencesTitle")}</h3>
        <div className={styles.rows}>
          <HubRow label={t("ui.language")} value={localeLabel(locale)} href="/app/settings" />
          <HubRow
            label={t("ui.select")}
            value={`${t("units.kilograms")}/${t("units.centimeters")}`}
            href="/app/settings"
          />
        </div>
      </section>

      <section className="card">
        <h3 className={styles.groupTitle}>{t("navSections.account")}</h3>
        <div className={styles.rows}>
          <HubRow label={t("nav.settings")} href="/app/settings" />
          <HubRow label={t("nav.billing")} href="/app/settings/billing" />
          <HubRow label={t("nav.profile")} href="/app/onboarding" />
        </div>
      </section>

      <section className="card">
        <h3 className={styles.groupTitle}>{t("navSections.more")}</h3>
        <div className={styles.rows}>
          <HubRow label={t("nav.tracking")} href="/app/seguimiento" />
          <HubRow label={t("profile.checkinTitle")} href="/app/seguimiento/check-in" />
          <HubRow label={t("nav.today")} href="/app/hoy" value={t("nav.weeklyReview")} />
          <HubRow label={t("nav.weeklyReview")} href="/app/weekly-review" />
          <HubRow label={t("nav.library")} href="/app/biblioteca" />
          <HubRow label={t("nav.trainingPlans")} href="/app/biblioteca/entrenamientos" />
          <HubRow label={t("nav.recipeLibrary")} href="/app/biblioteca/recetas" />
          <HubRow label={t("nav.feed")} href="/app/feed" />
          <HubRow label={t("nav.gym")} href="/app/gym" />
          {/* Requiere implementación: centro de notificaciones/cuenta dedicado fuera de las rutas existentes. */}
        </div>
      </section>
    </div>
  );
}

function HubRow({ label, value, href }: { label: string; value?: string; href: string }) {
  return (
    <Link className={styles.row} href={href}>
      <div>
        <p className={styles.rowLabel}>{label}</p>
        {value ? <p className={styles.rowValue}>{value}</p> : null}
      </div>
      <span className={styles.chevron} aria-hidden>
        ›
      </span>
    </Link>
  );
}
