"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { type Locale } from "@/lib/i18n";
import {
  defaultProfile,
  type Goal,
  type NutritionDietType,
  type ProfileData,
  type SessionTime,
  type TrainingLevel,
} from "@/lib/profile";
import { getUserProfile, updateUserProfilePreferences } from "@/lib/profileService";
import { isTrainer as isTrainerRole } from "@/lib/roles";
import { extractGymMembership, type GymMembership } from "@/lib/gymMembership";
import TrainerProfileSummary from "@/components/trainer/profile/TrainerProfileSummary";
import { ButtonLink } from "@/design-system/components/Button";
import { getMeasurementSystemLabel, getStoredMeasurementSystem, type MeasurementSystem } from "@/lib/measurementUnits";
import LogoutButton from "../LogoutButton";
import styles from "./ProfileSummaryClient.module.css";

type AuthState = {
  name: string | null;
  email: string | null;
  plan: string | null;
};

type EditableField = "goal" | "level" | "daysPerWeek" | "sessionTime" | "language" | "dietType" | "mealsPerDay";

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

function isTrainingField(field: EditableField | null) {
  return field === "goal" || field === "level" || field === "daysPerWeek" || field === "sessionTime";
}

function isNutritionField(field: EditableField | null) {
  return field === "dietType" || field === "mealsPerDay";
}

export default function ProfileSummaryClient() {
  const { t, locale, setLocale } = useLanguage();
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [auth, setAuth] = useState<AuthState>({ name: null, email: null, plan: null });
  const [isTrainer, setIsTrainer] = useState(false);
  const [gymMembership, setGymMembership] = useState<GymMembership>(UNKNOWN_MEMBERSHIP);
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>("metric");
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [draftGoal, setDraftGoal] = useState<Goal>("maintain");
  const [draftLevel, setDraftLevel] = useState<TrainingLevel>("beginner");
  const [draftDaysPerWeek, setDraftDaysPerWeek] = useState(4);
  const [draftSessionTime, setDraftSessionTime] = useState<SessionTime>("medium");
  const [draftLocale, setDraftLocale] = useState<Locale>("es");
  const [draftDietType, setDraftDietType] = useState<NutritionDietType>("balanced");
  const [draftMealsPerDay, setDraftMealsPerDay] = useState(3);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<EditableField | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setMeasurementSystem(getStoredMeasurementSystem());
    });

    const handleMeasurementSystemChange = () => {
      setMeasurementSystem(getStoredMeasurementSystem());
    };

    window.addEventListener("storage", handleMeasurementSystemChange);
    window.addEventListener("settings:measurement-system", handleMeasurementSystemChange);

    return () => {
      window.removeEventListener("storage", handleMeasurementSystemChange);
      window.removeEventListener("settings:measurement-system", handleMeasurementSystemChange);
    };
  }, []);

  useEffect(() => {
    setDraftGoal(profile.goal || "maintain");
    setDraftLevel(profile.trainingPreferences.level || "beginner");
    setDraftDaysPerWeek(profile.trainingPreferences.daysPerWeek ?? 4);
    setDraftSessionTime(profile.trainingPreferences.sessionTime || "medium");
    setDraftDietType(profile.nutritionPreferences.dietType || "balanced");
    setDraftMealsPerDay(profile.nutritionPreferences.mealsPerDay ?? 3);
  }, [
    profile.goal,
    profile.nutritionPreferences.dietType,
    profile.nutritionPreferences.mealsPerDay,
    profile.trainingPreferences.daysPerWeek,
    profile.trainingPreferences.level,
    profile.trainingPreferences.sessionTime,
  ]);

  useEffect(() => {
    setDraftLocale(locale);
  }, [locale]);

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

  function startEditing(field: EditableField) {
    setSaveError(null);
    setEditingField(field);
  }

  function resetDraft(field: EditableField) {
    if (field === "goal") {
      setDraftGoal((profile.goal || "maintain") as Goal);
      return;
    }
    if (field === "level") {
      setDraftLevel((profile.trainingPreferences.level || "beginner") as TrainingLevel);
      return;
    }
    if (field === "daysPerWeek") {
      setDraftDaysPerWeek(profile.trainingPreferences.daysPerWeek ?? 4);
      return;
    }
    if (field === "sessionTime") {
      setDraftSessionTime((profile.trainingPreferences.sessionTime || "medium") as SessionTime);
      return;
    }
    if (field === "language") {
      setDraftLocale(locale);
      return;
    }
    if (field === "dietType") {
      setDraftDietType((profile.nutritionPreferences.dietType || "balanced") as NutritionDietType);
      return;
    }
    setDraftMealsPerDay(profile.nutritionPreferences.mealsPerDay ?? 3);
  }

  function cancelEditing(field: EditableField) {
    setSaveError(null);
    resetDraft(field);
    setEditingField(null);
  }

  async function saveProfileField(field: Exclude<EditableField, "language">, nextProfile: ProfileData) {
    setSaveError(null);
    setSavingField(field);
    try {
      const savedProfile = await updateUserProfilePreferences(nextProfile);
      setProfile(savedProfile);
      setEditingField(null);
    } catch {
      setSaveError(t("profile.saveError"));
    } finally {
      setSavingField(null);
    }
  }

  async function saveGoal() {
    await saveProfileField("goal", {
      ...profile,
      goal: draftGoal,
    });
  }

  async function saveTrainingLevel() {
    await saveProfileField("level", {
      ...profile,
      trainingPreferences: {
        ...profile.trainingPreferences,
        level: draftLevel,
      },
    });
  }

  async function saveTrainingDays() {
    await saveProfileField("daysPerWeek", {
      ...profile,
      trainingPreferences: {
        ...profile.trainingPreferences,
        daysPerWeek: draftDaysPerWeek,
      },
    });
  }

  async function saveSessionTime() {
    await saveProfileField("sessionTime", {
      ...profile,
      trainingPreferences: {
        ...profile.trainingPreferences,
        sessionTime: draftSessionTime,
      },
    });
  }

  function saveLanguage() {
    setSaveError(null);
    setLocale(draftLocale);
    setEditingField(null);
  }

  async function saveDietType() {
    await saveProfileField("dietType", {
      ...profile,
      nutritionPreferences: {
        ...profile.nutritionPreferences,
        dietType: draftDietType,
      },
    });
  }

  async function saveMealsPerDay() {
    await saveProfileField("mealsPerDay", {
      ...profile,
      nutritionPreferences: {
        ...profile.nutritionPreferences,
        mealsPerDay: draftMealsPerDay,
      },
    });
  }

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

  const trainingDaysLabel = useMemo(() => {
    if (profile.trainingPreferences.daysPerWeek === null) return t("profile.noData");
    return String(profile.trainingPreferences.daysPerWeek);
  }, [profile.trainingPreferences.daysPerWeek, t]);

  const sessionTimeLabel = useMemo(() => {
    if (!profile.trainingPreferences.sessionTime) return t("profile.noData");
    if (profile.trainingPreferences.sessionTime === "short") return t("profile.trainingSessionShort");
    if (profile.trainingPreferences.sessionTime === "long") return t("profile.trainingSessionLong");
    return t("profile.trainingSessionMedium");
  }, [profile.trainingPreferences.sessionTime, t]);

  const dietTypeLabel = useMemo(() => {
    if (!profile.nutritionPreferences.dietType) return t("profile.noData");
    return t(`profile.dietType.${profile.nutritionPreferences.dietType}`);
  }, [profile.nutritionPreferences.dietType, t]);

  const mealsPerDayLabel = useMemo(() => {
    if (profile.nutritionPreferences.mealsPerDay === null) return t("profile.noData");
    return String(profile.nutritionPreferences.mealsPerDay);
  }, [profile.nutritionPreferences.mealsPerDay, t]);

  if (isTrainer) {
    return <TrainerProfileSummary profile={profile} loading={false} t={t} gymMembership={gymMembership} />;
  }

  const displayName = auth.name ?? profile.name ?? t("profile.noData");
  const displayEmail = auth.email ?? t("profile.noData");
  const profileAvatarUrl = profile.profilePhotoUrl ?? profile.avatarDataUrl ?? null;
  const avatarInitials = (displayName || t("profile.noData"))
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "FS";

  return (
    <div className={styles.stack}>
      <section className={`card premium-hero-card surface-action-card ${styles.userCard}`}>
        <div className={styles.userCardHeader}>
          {profileAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.userAvatar} src={profileAvatarUrl} alt={t("profile.avatarTitle")} />
          ) : (
            <div className={styles.userAvatarFallback} aria-hidden="true">
              {avatarInitials}
            </div>
          )}
          <div>
            <p className={styles.userName}>{displayName}</p>
            <p className={styles.userEmail}>{displayEmail}</p>
          </div>
        </div>
        <div className="inline-actions-sm mt-8">
          <a className="btn" href="/app/profile/edit">{t("profile.editProfile")}</a>
          <a className="btn secondary" href="/app/settings">{t("nav.settings")}</a>
        </div>
      </section>

      <section className={`card premium-surface-card surface-content-card ${styles.planCard}`}>
        <div>
          <p className={styles.planLabel}>{t("nav.billing")}</p>
          <p className={styles.planName}>{normalizePlanLabel(auth.plan)}</p>
        </div>
        <ButtonLink href="/app/settings/billing" size="sm">
          {t("ui.edit")}
        </ButtonLink>
      </section>

      <section className="card premium-surface-card surface-content-card">
        <h3 className={styles.groupTitle}>{t("nav.trainingPlan")}</h3>
        <div className={styles.rows}>
          <InlineSelectRow
            label={t("profile.goal")}
            value={goalLabel}
            isEditing={editingField === "goal"}
            onStartEdit={() => startEditing("goal")}
            onCancel={() => cancelEditing("goal")}
            onSave={saveGoal}
            saving={savingField === "goal"}
            saveLabel={t("ui.save")}
            cancelLabel={t("ui.cancel")}
            editor={
              <select
                aria-label={t("profile.goal")}
                value={draftGoal}
                onChange={(event) => setDraftGoal(event.target.value as Goal)}
                className={styles.inlineSelect}
              >
                <option value="cut">{t("profile.goalCut")}</option>
                <option value="maintain">{t("profile.goalMaintain")}</option>
                <option value="bulk">{t("profile.goalBulk")}</option>
              </select>
            }
          />
          <InlineSelectRow
            label={t("profile.trainingLevel")}
            value={levelLabel}
            isEditing={editingField === "level"}
            onStartEdit={() => startEditing("level")}
            onCancel={() => cancelEditing("level")}
            onSave={saveTrainingLevel}
            saving={savingField === "level"}
            saveLabel={t("ui.save")}
            cancelLabel={t("ui.cancel")}
            editor={
              <select
                aria-label={t("profile.trainingLevel")}
                value={draftLevel}
                onChange={(event) => setDraftLevel(event.target.value as TrainingLevel)}
                className={styles.inlineSelect}
              >
                <option value="beginner">{t("profile.trainingLevelBeginner")}</option>
                <option value="intermediate">{t("profile.trainingLevelIntermediate")}</option>
                <option value="advanced">{t("profile.trainingLevelAdvanced")}</option>
              </select>
            }
          />
          <InlineSelectRow
            label={t("profile.trainingDays")}
            value={trainingDaysLabel}
            isEditing={editingField === "daysPerWeek"}
            onStartEdit={() => startEditing("daysPerWeek")}
            onCancel={() => cancelEditing("daysPerWeek")}
            onSave={saveTrainingDays}
            saving={savingField === "daysPerWeek"}
            saveLabel={t("ui.save")}
            cancelLabel={t("ui.cancel")}
            editor={
              <select
                aria-label={t("profile.trainingDays")}
                value={draftDaysPerWeek}
                onChange={(event) => setDraftDaysPerWeek(Number(event.target.value))}
                className={styles.inlineSelect}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                  <option key={days} value={days}>
                    {days}
                  </option>
                ))}
              </select>
            }
          />
          <InlineSelectRow
            label={t("profile.trainingSessionTime")}
            value={sessionTimeLabel}
            isEditing={editingField === "sessionTime"}
            onStartEdit={() => startEditing("sessionTime")}
            onCancel={() => cancelEditing("sessionTime")}
            onSave={saveSessionTime}
            saving={savingField === "sessionTime"}
            saveLabel={t("ui.save")}
            cancelLabel={t("ui.cancel")}
            editor={
              <select
                aria-label={t("profile.trainingSessionTime")}
                value={draftSessionTime}
                onChange={(event) => setDraftSessionTime(event.target.value as SessionTime)}
                className={styles.inlineSelect}
              >
                <option value="short">{t("profile.trainingSessionShort")}</option>
                <option value="medium">{t("profile.trainingSessionMedium")}</option>
                <option value="long">{t("profile.trainingSessionLong")}</option>
              </select>
            }
          />
        </div>
        {saveError && isTrainingField(editingField) ? <p className={styles.inlineError}>{saveError}</p> : null}
      </section>

      <section className="card premium-surface-card surface-content-card">
        <h3 className={styles.groupTitle}>{t("profile.preferencesTitle")}</h3>
        <div className={styles.rows}>
          <InlineSelectRow
            label={t("ui.language")}
            value={localeLabel(locale)}
            isEditing={editingField === "language"}
            onStartEdit={() => startEditing("language")}
            onCancel={() => cancelEditing("language")}
            onSave={saveLanguage}
            saving={false}
            saveLabel={t("ui.save")}
            cancelLabel={t("ui.cancel")}
            editor={
              <select
                aria-label={t("ui.language")}
                value={draftLocale}
                onChange={(event) => setDraftLocale(event.target.value as Locale)}
                className={styles.inlineSelect}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            }
          />
          <HubRow
            label={t("settings.sections.units.title")}
            value={getMeasurementSystemLabel(measurementSystem, t)}
            href="/app/settings?modal=units"
          />
        </div>
      </section>

      <section className="card premium-surface-card surface-content-card">
        <h3 className={styles.groupTitle}>{t("nav.nutrition")}</h3>
        <div className={styles.rows}>
          <InlineSelectRow
            label={t("profile.dietTypeLabel")}
            value={dietTypeLabel}
            isEditing={editingField === "dietType"}
            onStartEdit={() => startEditing("dietType")}
            onCancel={() => cancelEditing("dietType")}
            onSave={saveDietType}
            saving={savingField === "dietType"}
            saveLabel={t("ui.save")}
            cancelLabel={t("ui.cancel")}
            editor={
              <select
                aria-label={t("profile.dietTypeLabel")}
                value={draftDietType}
                onChange={(event) => setDraftDietType(event.target.value as NutritionDietType)}
                className={styles.inlineSelect}
              >
                <option value="balanced">{t("profile.dietType.balanced")}</option>
                <option value="mediterranean">{t("profile.dietType.mediterranean")}</option>
                <option value="keto">{t("profile.dietType.keto")}</option>
                <option value="vegetarian">{t("profile.dietType.vegetarian")}</option>
                <option value="vegan">{t("profile.dietType.vegan")}</option>
                <option value="pescatarian">{t("profile.dietType.pescatarian")}</option>
                <option value="paleo">{t("profile.dietType.paleo")}</option>
                <option value="flexible">{t("profile.dietType.flexible")}</option>
              </select>
            }
          />
          <InlineSelectRow
            label={t("profile.mealsPerDay")}
            value={mealsPerDayLabel}
            isEditing={editingField === "mealsPerDay"}
            onStartEdit={() => startEditing("mealsPerDay")}
            onCancel={() => cancelEditing("mealsPerDay")}
            onSave={saveMealsPerDay}
            saving={savingField === "mealsPerDay"}
            saveLabel={t("ui.save")}
            cancelLabel={t("ui.cancel")}
            editor={
              <select
                aria-label={t("profile.mealsPerDay")}
                value={draftMealsPerDay}
                onChange={(event) => setDraftMealsPerDay(Number(event.target.value))}
                className={styles.inlineSelect}
              >
                {[1, 2, 3, 4, 5, 6].map((meals) => (
                  <option key={meals} value={meals}>
                    {meals}
                  </option>
                ))}
              </select>
            }
          />
        </div>
        {saveError && isNutritionField(editingField) ? <p className={styles.inlineError}>{saveError}</p> : null}
      </section>

      <section className={`card premium-surface-card surface-content-card ${styles.accountCard}`}>
        <div className={styles.accountHeader}>
          <div>
            <p className={styles.accountEyebrow}>{t("profile.accountSectionEyebrow")}</p>
            <h3 className={styles.groupTitle}>{t("navSections.account")}</h3>
          </div>
          <span className={styles.accountBadge}>{t("profile.accountSectionBadge")}</span>
        </div>
        <div className={styles.rows}>
          <HubRow label={t("nav.settings")} href="/app/settings" />
          <HubRow label={t("nav.billing")} href="/app/settings/billing" />
          <HubRow label={t("nav.profile")} href="/app/profile/edit" />
          <HubRow label={t("profile.passwordTitle")} href="/app/settings/password" />
        </div>
      </section>

      <section className="card premium-surface-card surface-content-card">
        <h3 className={styles.groupTitle}>{t("navSections.more")}</h3>
        <div className={styles.rows}>
          <HubRow label={t("nav.tracking")} href="/app/seguimiento" />
          <HubRow label={t("profile.checkinTitle")} href="/app/seguimiento/check-in" />
          <HubRow label={t("nav.today")} href="/app/hoy" />
          <HubRow label={t("nav.library")} href="/app/biblioteca" />
          {/* Requiere implementación: centro de notificaciones/cuenta dedicado fuera de las rutas existentes. */}
        </div>
      </section>

      <section className={`card premium-surface-card surface-content-card ${styles.logoutCard}`}>
        <div className={styles.logoutIntro}>
          <p className={styles.logoutTitle}>{t("nav.logout")}</p>
          <p className={styles.logoutDescription}>{t("profile.logoutDescription")}</p>
        </div>
        <LogoutButton className={styles.logoutButton} />
      </section>
    </div>
  );
}

function InlineSelectRow({
  label,
  value,
  isEditing,
  onStartEdit,
  onCancel,
  onSave,
  saving,
  editor,
  saveLabel,
  cancelLabel,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  editor: ReactNode;
  saveLabel: string;
  cancelLabel: string;
}) {
  if (!isEditing) {
    return (
      <button type="button" className={`${styles.row} ${styles.rowButton}`} onClick={onStartEdit}>
        <div>
          <p className={styles.rowLabel}>{label}</p>
          <p className={styles.rowValue}>{value}</p>
        </div>
        <span className={styles.chevron} aria-hidden>
          ›
        </span>
      </button>
    );
  }

  return (
    <div className={styles.row}>
      <div className={styles.inlineEditor}>
        <p className={styles.rowLabel}>{label}</p>
        {editor}
        <div className={styles.inlineActions}>
          <button type="button" className="btn tiny" onClick={onSave} disabled={saving}>
            {saving ? "..." : saveLabel}
          </button>
          <button type="button" className="btn tiny secondary" onClick={onCancel} disabled={saving}>
            {cancelLabel}
          </button>
        </div>
      </div>
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
