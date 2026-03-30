"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Input } from "@/design-system/components/Input";
import { useLanguage } from "@/context/LanguageProvider";
import { trackEvent } from "@/lib/analytics";
import styles from "./OnboardingClient.module.css";
import {
  defaultProfile,
  type Activity,
  type Goal,
  type MacroFormula,
  type MealDistributionPreset,
  type NutritionCookingTime,
  type NutritionDietType,
  type ProfileData,
  type Sex,
  type SessionTime,
  type TrainingEquipment,
  type TrainingFocus,
  type TrainingLevel,
} from "@/lib/profile";
import { mergeProfileData } from "@/lib/profileService";
import { isProfileComplete } from "@/lib/profileCompletion";

type Props = {
  nextUrl?: string;
  ai?: string;
};

type LoadState = "loading" | "ready" | "empty" | "error";
type SaveState = "idle" | "saving" | "success" | "error";

const FIRST_STEP = 0;
const LAST_STEP = 5;

type OnboardingDefaults = {
  activity: Activity;
  trainingPreferences: Pick<ProfileData["trainingPreferences"], "daysPerWeek" | "level" | "sessionTime" | "focus" | "workoutLength">;
  nutritionPreferences: Pick<ProfileData["nutritionPreferences"], "mealsPerDay" | "dietType" | "cookingTime" | "mealDistribution">;
};

const FORMULA_DEFAULTS: Record<MacroFormula, { proteinGPerKg: number; fatGPerKg: number; cutPercent: number; bulkPercent: number }> = {
  katch: { proteinGPerKg: 1.8, fatGPerKg: 0.8, cutPercent: 15, bulkPercent: 10 },
  mifflin: { proteinGPerKg: 1.8, fatGPerKg: 0.8, cutPercent: 15, bulkPercent: 10 },
};

const parseNumberInput = (value: string) => (value.trim() === "" ? null : Number(value));
const hasPositiveNumber = (value: number | null | undefined) => Number.isFinite(value) && (value ?? 0) > 0;
const renderFieldLabel = (label: string, required = false) => (
  <>
    {label}
    {required ? " *" : ""}
  </>
);

const getOnboardingDefaults = (sex: Sex | "", age: number | null): OnboardingDefaults => {
  const ageValue = age ?? 30;
  const isYoungAdult = ageValue < 30;
  const isOlderAdult = ageValue >= 45;

  return {
    activity: isYoungAdult ? "moderate" : isOlderAdult ? "light" : "moderate",
    trainingPreferences: {
      daysPerWeek: isOlderAdult ? 3 : 4,
      level: "beginner",
      sessionTime: "medium",
      focus: "full",
      workoutLength: "45m",
    },
    nutritionPreferences: {
      mealsPerDay: isYoungAdult ? 4 : 3,
      dietType: "balanced",
      cookingTime: "quick",
      mealDistribution: { preset: "balanced" },
    },
  };
};

const applyOnboardingDefaults = (profile: ProfileData, sex: Sex | "", age: number | null): ProfileData => {
  const defaults = getOnboardingDefaults(sex, age);
  return {
    ...profile,
    activity: profile.activity || defaults.activity,
    trainingPreferences: {
      ...profile.trainingPreferences,
      daysPerWeek: profile.trainingPreferences.daysPerWeek ?? defaults.trainingPreferences.daysPerWeek,
      level: profile.trainingPreferences.level || defaults.trainingPreferences.level,
      sessionTime: profile.trainingPreferences.sessionTime || defaults.trainingPreferences.sessionTime,
      focus: profile.trainingPreferences.focus || defaults.trainingPreferences.focus,
      workoutLength: profile.trainingPreferences.workoutLength || defaults.trainingPreferences.workoutLength,
    },
    nutritionPreferences: {
      ...profile.nutritionPreferences,
      mealsPerDay: profile.nutritionPreferences.mealsPerDay ?? defaults.nutritionPreferences.mealsPerDay,
      dietType: profile.nutritionPreferences.dietType || defaults.nutritionPreferences.dietType,
      cookingTime: profile.nutritionPreferences.cookingTime || defaults.nutritionPreferences.cookingTime,
      mealDistribution:
        profile.nutritionPreferences.mealDistribution.preset === ""
          ? defaults.nutritionPreferences.mealDistribution
          : profile.nutritionPreferences.mealDistribution,
    },
  };
};

export default function OnboardingClient({ nextUrl, ai }: Props) {
  const { t } = useLanguage();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [step, setStep] = useState<number>(FIRST_STEP);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showAdvancedMacros, setShowAdvancedMacros] = useState(false);
  const [isProteinTouched, setIsProteinTouched] = useState(false);
  const [isFatTouched, setIsFatTouched] = useState(false);
  const [isCutTouched, setIsCutTouched] = useState(false);
  const [isBulkTouched, setIsBulkTouched] = useState(false);

  const updateProfile = useCallback(<K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateTrainingPreference = useCallback(
    <K extends keyof ProfileData["trainingPreferences"]>(key: K, value: ProfileData["trainingPreferences"][K]) => {
      setProfile((prev) => ({
        ...prev,
        trainingPreferences: {
          ...prev.trainingPreferences,
          [key]: value,
        },
      }));
    },
    []
  );

  const updateNutritionPreference = useCallback(
    <K extends keyof ProfileData["nutritionPreferences"]>(
      key: K,
      value: ProfileData["nutritionPreferences"][K]
    ) => {
      setProfile((prev) => ({
        ...prev,
        nutritionPreferences: {
          ...prev.nutritionPreferences,
          [key]: value,
        },
      }));
    },
    []
  );

  const updateMacroPreference = useCallback(
    <K extends keyof ProfileData["macroPreferences"]>(key: K, value: ProfileData["macroPreferences"][K]) => {
      setProfile((prev) => ({
        ...prev,
        macroPreferences: {
          ...prev.macroPreferences,
          [key]: value,
        },
      }));
    },
    []
  );

  const loadProfile = useCallback(async () => {
    setLoadState("loading");
    try {
      const response = await fetch("/api/profile", { cache: "no-store", credentials: "include" });
      if (!response.ok) {
        setLoadState("error");
        return;
      }

      const data = (await response.json()) as Partial<ProfileData> | null;
      const merged = applyOnboardingDefaults(
        mergeProfileData(data ?? undefined),
        (data?.sex as Sex | "" | undefined) ?? "",
        data?.age ?? null
      );
      setProfile(merged);
      setIsProteinTouched(merged.macroPreferences.proteinGPerKg !== null);
      setIsFatTouched(merged.macroPreferences.fatGPerKg !== null);
      setIsCutTouched(merged.macroPreferences.cutPercent !== null);
      setIsBulkTouched(merged.macroPreferences.bulkPercent !== null);
      setLoadState(data && Object.keys(data).length > 0 ? "ready" : "empty");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
  }, [loadProfile]);


  const objectiveOptions: Array<{ value: Goal; label: string }> = useMemo(
    () => [
      { value: "cut", label: t("profile.goalCut") },
      { value: "maintain", label: t("profile.goalMaintain") },
      { value: "bulk", label: t("profile.goalBulk") },
    ],
    [t]
  );

  const activityOptions: Array<{ value: Activity; label: string }> = useMemo(
    () => [
      { value: "sedentary", label: t("profile.activitySedentary") },
      { value: "light", label: t("profile.activityLight") },
      { value: "moderate", label: t("profile.activityModerate") },
      { value: "very", label: t("profile.activityVery") },
      { value: "extra", label: t("profile.activityExtra") },
    ],
    [t]
  );

  const levelOptions: Array<{ value: TrainingLevel; label: string }> = useMemo(
    () => [
      { value: "beginner", label: t("profile.trainingLevelBeginner") },
      { value: "intermediate", label: t("profile.trainingLevelIntermediate") },
      { value: "advanced", label: t("profile.trainingLevelAdvanced") },
    ],
    [t]
  );

  const sessionTimeOptions: Array<{ value: SessionTime; label: string }> = useMemo(
    () => [
      { value: "short", label: t("profile.trainingSessionShort") },
      { value: "medium", label: t("profile.trainingSessionMedium") },
      { value: "long", label: t("profile.trainingSessionLong") },
    ],
    [t]
  );

  const trainingFocusOptions: Array<{ value: TrainingFocus; label: string }> = useMemo(
    () => [
      { value: "full", label: t("profile.trainingFocusFull") },
      { value: "upperLower", label: t("profile.trainingFocusUpperLower") },
      { value: "ppl", label: t("profile.trainingFocusPpl") },
    ],
    [t]
  );

  const trainingEquipmentOptions: Array<{ value: TrainingEquipment; label: string }> = useMemo(
    () => [
      { value: "gym", label: t("profile.trainingEquipmentGym") },
      { value: "home", label: t("profile.trainingEquipmentHome") },
    ],
    [t]
  );

  const dietOptions: Array<{ value: NutritionDietType; label: string }> = useMemo(
    () => [
      { value: "balanced", label: t("profile.dietType.balanced") },
      { value: "mediterranean", label: t("profile.dietType.mediterranean") },
      { value: "keto", label: t("profile.dietType.keto") },
      { value: "vegetarian", label: t("profile.dietType.vegetarian") },
      { value: "vegan", label: t("profile.dietType.vegan") },
      { value: "pescatarian", label: t("profile.dietType.pescatarian") },
      { value: "paleo", label: t("profile.dietType.paleo") },
      { value: "flexible", label: t("profile.dietType.flexible") },
    ],
    [t]
  );

  const cookingTimeOptions: Array<{ value: NutritionCookingTime; label: string }> = useMemo(
    () => [
      { value: "quick", label: t("profile.cookingTimeOptionQuick") },
      { value: "medium", label: t("profile.cookingTimeOptionMedium") },
      { value: "long", label: t("profile.cookingTimeOptionLong") },
    ],
    [t]
  );

  const mealDistributionOptions: Array<{ value: MealDistributionPreset; label: string }> = useMemo(
    () => [
      { value: "balanced", label: t("profile.mealDistributionBalanced") },
      { value: "lightDinner", label: t("profile.mealDistributionLightDinner") },
      { value: "bigBreakfast", label: t("profile.mealDistributionBigBreakfast") },
      { value: "bigLunch", label: t("profile.mealDistributionBigLunch") },
      { value: "custom", label: t("profile.mealDistributionCustom") },
    ],
    [t]
  );

  const macroFormulaOptions: Array<{ value: MacroFormula; label: string }> = useMemo(
    () => [
      { value: "mifflin", label: t("profile.macroFormulaMifflin") },
      { value: "katch", label: t("profile.macroFormulaKatch") },
    ],
    [t]
  );

  const goToNext = () => setStep((current) => Math.min(current + 1, LAST_STEP));
  const goToBack = () => {
    if (step === FIRST_STEP) {
      router.push("/app/hoy");
      return;
    }
    setStep((current) => Math.max(current - 1, FIRST_STEP));
  };

  const continueAfterSuccess = () => {
    if (ai === "training") {
      router.push("/app/entrenamiento?ai=1");
      return;
    }
    if (ai === "nutrition") {
      router.push("/app/nutricion?ai=1");
      return;
    }
    if (nextUrl) {
      router.push(nextUrl);
      return;
    }
    router.push("/app/hoy");
  };

  const saveProfile = useCallback(async () => {
    setSaveState("saving");
    const profileToSave: ProfileData = {
      ...profile,
      macroPreferences: {
        ...profile.macroPreferences,
        formula: profile.macroPreferences.formula || "mifflin",
      },
    };
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileToSave),
        credentials: "include",
      });

      if (!response.ok) {
        setSaveState("error");
        return;
      }

      const data = (await response.json()) as Partial<ProfileData> | null;
      setProfile(mergeProfileData(data ?? profileToSave));
      setSaveState("success");
      trackEvent("onboarding_completed", { origin: "onboarding" });
    } catch {
      setSaveState("error");
    }
  }, [profile]);

  const hasValidBasics =
    hasPositiveNumber(profile.age) &&
    hasPositiveNumber(profile.heightCm) &&
    hasPositiveNumber(profile.weightKg);
  const canFinishOnboarding = isProfileComplete({
    ...profile,
    macroPreferences: {
      ...profile.macroPreferences,
      formula: profile.macroPreferences.formula || "mifflin",
    },
  });
  const isStepValid =
    step === 0
      ? hasValidBasics
      : step === LAST_STEP
        ? canFinishOnboarding
        : true;

  if (loadState === "loading") {
    return (
      <div className={`page ${styles.onboardingScope}`}>
        <LoadingState
          title={t("onboarding.title")}
          ariaLabel={t("onboarding.loadingState")}
          lines={4}
          cardClassName="onboarding-step-card"
        />
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className={`page ${styles.onboardingScope}`}>
        <ErrorState
          title={t("onboarding.errorTitle")}
          description={t("onboarding.errorSubtitle")}
          retryLabel={t("onboarding.retry")}
          onRetry={() => void loadProfile()}
          wrapInCard
          cardClassName="onboarding-step-card"
          actions={[{ label: t("onboarding.back"), onClick: () => router.push("/app/hoy"), variant: "ghost" }]}
        />
      </div>
    );
  }

  if (loadState === "empty") {
    return (
      <div className={`page ${styles.onboardingScope}`}>
        <EmptyState
          title={t("onboarding.emptyTitle")}
          description={t("onboarding.emptySubtitle")}
          wrapInCard
          cardClassName="onboarding-step-card"
          actions={[
            { label: t("onboarding.emptyAction"), onClick: () => setLoadState("ready") },
            { label: t("onboarding.retry"), onClick: () => void loadProfile(), variant: "secondary" },
          ]}
        />
      </div>
    );
  }

  if (saveState === "success") {
    return (
      <div className={`page ${styles.onboardingScope}`}>
        <EmptyState
          title={t("onboarding.successTitle")}
          description={t("onboarding.successSubtitle")}
          icon="check"
          wrapInCard
          cardClassName="onboarding-step-card"
          actions={[{ label: t("onboarding.continue"), onClick: continueAfterSuccess }]}
        />
      </div>
    );
  }

  return (
    <div className={`page onboarding-shell ${styles.onboardingScope}`}>
      <section className="card onboarding-shell-hero premium-hero-card">
        <div className="onboarding-shell-brand">
          <div className="onboarding-shell-logo">FS</div>
          <div>
            <h2 className="section-title">{t("onboarding.title")}</h2>
            <p className="section-subtitle">{t("onboarding.subtitle")}</p>
          </div>
        </div>
        <div className="onboarding-shell-progress" aria-label={t("onboarding.stepCounter", { current: step + 1, total: LAST_STEP + 1 })}>
          {Array.from({ length: LAST_STEP + 1 }).map((_, index) => (
            <span key={index} className={`onboarding-shell-progress-bar ${index <= step ? "is-active" : ""} ${index === step ? "is-current" : ""}`} />
          ))}
        </div>
        <p className="muted onboarding-shell-counter">{t("onboarding.stepCounter", { current: step + 1, total: LAST_STEP + 1 })}</p>
      </section>

      {step === 0 ? (
        <section className="card form-stack onboarding-step-card premium-step-card">
          <h3 className="section-title">{t("profile.basicsTitle")}</h3>
          <Input
            variant="premium"
            label={t("profile.name")}
            value={profile.name}
            onChange={(e) => updateProfile("name", e.target.value)}
          />
          <label className="form-stack">
            {t("profile.sex")}
            <select
              value={profile.sex}
              onChange={(e) => {
                const nextSex = e.target.value as Sex | "";
                setProfile((prev) => applyOnboardingDefaults({ ...prev, sex: nextSex }, nextSex, prev.age));
              }}
            >
              <option value="">{t("profile.selectPlaceholder")}</option>
              <option value="male">{t("profile.sexMale")}</option>
              <option value="female">{t("profile.sexFemale")}</option>
            </select>
          </label>
          <Input
            variant="premium"
            type="number"
            label={`${t("profile.age")} *`}
            value={profile.age ?? ""}
            onChange={(e) => {
              const nextAge = parseNumberInput(e.target.value);
              setProfile((prev) => applyOnboardingDefaults({ ...prev, age: nextAge }, prev.sex, nextAge));
            }}
          />
          <Input
            variant="premium"
            type="number"
            label={`${t("profile.height")} *`}
            value={profile.heightCm ?? ""}
            onChange={(e) => updateProfile("heightCm", parseNumberInput(e.target.value))}
          />
          <Input
            variant="premium"
            type="number"
            label={`${t("profile.weight")} *`}
            value={profile.weightKg ?? ""}
            onChange={(e) => updateProfile("weightKg", parseNumberInput(e.target.value))}
          />
          <p className="muted">{t("onboarding.defaultsHint")}</p>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="card form-stack onboarding-step-card premium-step-card">
          <h3 className="section-title">{t("onboarding.objectiveTitle")}</h3>
          <label className="form-stack">
            {t("profile.goal")}
            <select value={profile.goal} onChange={(event) => updateProfile("goal", event.target.value as Goal | "")}> 
              <option value="">{t("profile.selectPlaceholder")}</option>
              {objectiveOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <Input
            variant="premium"
            type="number"
            label={t("profile.goalWeight")}
            value={profile.goalWeightKg ?? ""}
            onChange={(e) => updateProfile("goalWeightKg", parseNumberInput(e.target.value))}
          />
        </section>
      ) : null}

      {step === 2 ? (
        <section className="card form-stack onboarding-step-card premium-step-card">
          <h3 className="section-title">{t("onboarding.levelTitle")}</h3>
          <label className="form-stack">
            {t("profile.activity")}
            <select value={profile.activity} onChange={(e) => updateProfile("activity", e.target.value as Activity | "")}> 
              <option value="">{t("profile.selectPlaceholder")}</option>
              {activityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="form-stack">
            {t("profile.trainingLevel")}
            <select
              value={profile.trainingPreferences.level}
              onChange={(e) => updateTrainingPreference("level", e.target.value as TrainingLevel | "")}
            >
              <option value="">{t("profile.selectPlaceholder")}</option>
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <Input
            variant="premium"
            type="number"
            label={t("profile.trainingDays")}
            value={profile.trainingPreferences.daysPerWeek ?? ""}
            onChange={(e) => updateTrainingPreference("daysPerWeek", parseNumberInput(e.target.value))}
          />
          <label className="form-stack">
            {t("profile.trainingSessionTime")}
            <select
              value={profile.trainingPreferences.sessionTime}
              onChange={(e) => updateTrainingPreference("sessionTime", e.target.value as SessionTime | "")}
            >
              <option value="">{t("profile.selectPlaceholder")}</option>
              {sessionTimeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="form-stack">
            {t("profile.trainingFocus")}
            <select
              value={profile.trainingPreferences.focus}
              onChange={(e) => updateTrainingPreference("focus", e.target.value as TrainingFocus | "")}
            >
              <option value="">{t("profile.selectPlaceholder")}</option>
              {trainingFocusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="form-stack">
            {t("profile.trainingEquipment")}
            <select
              value={profile.trainingPreferences.equipment}
              onChange={(e) => updateTrainingPreference("equipment", e.target.value as TrainingEquipment | "")}
            >
              <option value="">{t("profile.selectPlaceholder")}</option>
              {trainingEquipmentOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="card form-stack onboarding-step-card premium-step-card">
          <h3 className="section-title">{t("onboarding.preferencesTitle")}</h3>
          <Input
            variant="premium"
            type="number"
            label={t("profile.mealsPerDay")}
            value={profile.nutritionPreferences.mealsPerDay ?? ""}
            onChange={(e) => updateNutritionPreference("mealsPerDay", parseNumberInput(e.target.value))}
          />
          <label className="form-stack">
            {t("profile.dietType")}
            <select
              value={profile.nutritionPreferences.dietType}
              onChange={(event) => updateNutritionPreference("dietType", event.target.value as NutritionDietType | "")}
            >
              <option value="">{t("profile.selectPlaceholder")}</option>
              {dietOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="form-stack">
            {t("profile.cookingTime")}
            <select
              value={profile.nutritionPreferences.cookingTime}
              onChange={(e) => updateNutritionPreference("cookingTime", e.target.value as NutritionCookingTime | "")}
            >
              <option value="">{t("profile.selectPlaceholder")}</option>
              {cookingTimeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="form-stack">
            {t("profile.mealDistributionLabel")}
            <select
              value={profile.nutritionPreferences.mealDistribution.preset}
              onChange={(event) => updateNutritionPreference("mealDistribution", { preset: event.target.value as MealDistributionPreset | "" })}
            >
              <option value="">{t("profile.selectPlaceholder")}</option>
              {mealDistributionOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="card form-stack onboarding-step-card premium-step-card">
          <h3 className="section-title">{t("profile.macroTitle")}</h3>
          <label className="form-stack">
            {renderFieldLabel(t("profile.macroFormula"), true)}
            <select
              value={profile.macroPreferences.formula}
              onChange={(e) => {
                const nextFormula = e.target.value as MacroFormula | "";
                updateMacroPreference("formula", nextFormula);
                if (!nextFormula) {
                  return;
                }
                const defaults = FORMULA_DEFAULTS[nextFormula];
                if (!isProteinTouched) {
                  updateMacroPreference("proteinGPerKg", defaults.proteinGPerKg);
                }
                if (!isFatTouched) {
                  updateMacroPreference("fatGPerKg", defaults.fatGPerKg);
                }
                if (!isCutTouched) {
                  updateMacroPreference("cutPercent", defaults.cutPercent);
                }
                if (!isBulkTouched) {
                  updateMacroPreference("bulkPercent", defaults.bulkPercent);
                }
              }}
            >
              <option value="">{t("profile.selectPlaceholder")}</option>
              {macroFormulaOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={showAdvancedMacros} onChange={(e) => setShowAdvancedMacros(e.target.checked)} />
            {t("profile.macroAdvancedToggle")}
          </label>
          {!showAdvancedMacros ? <p className="muted m-0 text-xs">{t("profile.macroAdvancedToggle")}</p> : null}
          <Input
            variant="premium"
            type="number"
            disabled={!showAdvancedMacros}
            label={t("profile.macroProtein")}
            helperText={t("profile.macroProteinPlaceholder")}
            value={profile.macroPreferences.proteinGPerKg ?? ""}
            onChange={(e) => {
              setIsProteinTouched(true);
              updateMacroPreference("proteinGPerKg", parseNumberInput(e.target.value));
            }}
          />
          <Input
            variant="premium"
            type="number"
            disabled={!showAdvancedMacros}
            label={t("profile.macroFat")}
            helperText={t("profile.macroFatPlaceholder")}
            value={profile.macroPreferences.fatGPerKg ?? ""}
            onChange={(e) => {
              setIsFatTouched(true);
              updateMacroPreference("fatGPerKg", parseNumberInput(e.target.value));
            }}
          />
          <Input
            variant="premium"
            type="number"
            disabled={!showAdvancedMacros}
            label={t("profile.macroCutPercent")}
            helperText={t("profile.macroCutPercentPlaceholder")}
            value={profile.macroPreferences.cutPercent ?? ""}
            onChange={(e) => {
              setIsCutTouched(true);
              updateMacroPreference("cutPercent", parseNumberInput(e.target.value));
            }}
          />
          <Input
            variant="premium"
            type="number"
            disabled={!showAdvancedMacros}
            label={t("profile.macroBulkPercent")}
            helperText={t("profile.macroBulkPercentPlaceholder")}
            value={profile.macroPreferences.bulkPercent ?? ""}
            onChange={(e) => {
              setIsBulkTouched(true);
              updateMacroPreference("bulkPercent", parseNumberInput(e.target.value));
            }}
          />
        </section>
      ) : null}

      {step === 5 ? (
        <section className="card form-stack onboarding-step-card premium-step-card">
          <h3 className="section-title">{t("profile.notes")}</h3>
          <label className="form-stack">
            {t("profile.injuriesLabel")}
            <textarea value={profile.injuries} onChange={(e) => updateProfile("injuries", e.target.value)} />
          </label>
          <label className="form-stack">
            {t("profile.notes")}
            <textarea value={profile.notes} onChange={(e) => updateProfile("notes", e.target.value)} />
          </label>
        </section>
      ) : null}

      <section className="card form-stack onboarding-footer-card">
        {saveState === "error" ? (
          <div className="status-card status-card--warning" role="alert">
            <p className="muted m-0">{t("onboarding.saveError")}</p>
            <div className="inline-actions-sm mt-8">
              <button type="button" className="btn secondary fit-content" onClick={() => void saveProfile()}>{t("onboarding.retry")}</button>
            </div>
          </div>
        ) : null}
        <div className="inline-actions-sm">
          <button type="button" className="btn secondary" onClick={goToBack} disabled={saveState === "saving"}>{t("onboarding.back")}</button>
          {step < LAST_STEP ? <button type="button" className="btn" onClick={goToNext} disabled={!isStepValid || saveState === "saving"}>{t("onboarding.next")}</button> : <button type="button" className="btn" onClick={() => void saveProfile()} disabled={!isStepValid || saveState === "saving"}>{saveState === "saving" ? t("onboarding.saving") : t("onboarding.finish")}</button>}
        </div>
      </section>
    </div>
  );
}
