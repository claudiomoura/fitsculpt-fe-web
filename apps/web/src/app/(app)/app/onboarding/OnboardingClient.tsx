"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Input } from "@/design-system/components/Input";
import { useLanguage } from "@/context/LanguageProvider";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
import { mergeProfileData, updateUserProfilePreferences } from "@/lib/profileService";
import { isProfileComplete } from "@/lib/profileCompletion";
import { normalizeGoalWeightForGoal } from "@/lib/profileGoal";
import { readOnboardingDraft, writeOnboardingDraft } from "@/lib/onboardingDraft";

type Props = {
  nextUrl?: string;
  ai?: string;
  mode?: "authenticated" | "guest";
  lockViewport?: boolean;
  activationAction?: (formData: FormData) => void | Promise<void>;
  activationError?: "promo" | "generic" | null;
};

type LoadState = "loading" | "ready" | "empty" | "error";
type SaveState = "idle" | "saving" | "success" | "error";
type StepDefinition = {
  eyebrow: string;
  title: string;
  description: string;
};

type ChoiceOption<T extends string | number> = {
  value: T;
  label: string;
  hint?: string;
};

const FIRST_STEP = 0;
const LAST_STEP = 11;

type OnboardingDefaults = {
  activity: Activity;
  trainingPreferences: Pick<
    ProfileData["trainingPreferences"],
    "daysPerWeek" | "level" | "sessionTime" | "focus" | "workoutLength" | "equipment"
  >;
  nutritionPreferences: Pick<ProfileData["nutritionPreferences"], "mealsPerDay" | "dietType" | "cookingTime" | "mealDistribution">;
  macroFormula: MacroFormula;
};

const FORMULA_DEFAULTS: Record<MacroFormula, { proteinGPerKg: number; fatGPerKg: number; cutPercent: number; bulkPercent: number }> = {
  katch: { proteinGPerKg: 1.8, fatGPerKg: 0.8, cutPercent: 15, bulkPercent: 10 },
  mifflin: { proteinGPerKg: 1.8, fatGPerKg: 0.8, cutPercent: 15, bulkPercent: 10 },
};

const parseNumberInput = (value: string) => (value.trim() === "" ? null : Number(value));
const hasPositiveNumber = (value: number | null | undefined) => Number.isFinite(value) && (value ?? 0) > 0;
const joinSummaryParts = (parts: Array<string | null | undefined>) => parts.filter(Boolean).join(" · ");
const formatWeight = (value: number | null | undefined, fallback: string) =>
  Number.isFinite(value) ? `${value} kg` : fallback;
const resolveOptionLabel = <T extends string>(value: T | "", options: Array<{ value: T; label: string }>, fallback: string) =>
  options.find((option) => option.value === value)?.label ?? fallback;
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
      equipment: "gym",
    },
    nutritionPreferences: {
      mealsPerDay: isYoungAdult ? 4 : 3,
      dietType: "balanced",
      cookingTime: "quick",
      mealDistribution: { preset: "balanced" },
    },
    macroFormula: "mifflin",
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
      equipment: profile.trainingPreferences.equipment || defaults.trainingPreferences.equipment,
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
    macroPreferences: {
      ...profile.macroPreferences,
      formula: profile.macroPreferences.formula || defaults.macroFormula,
    },
  };
};

export default function OnboardingClient({
  nextUrl,
  ai,
  mode = "authenticated",
  lockViewport = false,
  activationAction,
  activationError = null,
}: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const isGuestMode = mode === "guest";

  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [step, setStep] = useState<number>(isGuestMode && activationError ? LAST_STEP : FIRST_STEP);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showAdvancedMacros, setShowAdvancedMacros] = useState(false);
  const [isProteinTouched, setIsProteinTouched] = useState(false);
  const [isFatTouched, setIsFatTouched] = useState(false);
  const [isCutTouched, setIsCutTouched] = useState(false);
  const [isBulkTouched, setIsBulkTouched] = useState(false);
  const [activationEmail, setActivationEmail] = useState("");
  const [activationPassword, setActivationPassword] = useState("");
  const [activationPromoCode, setActivationPromoCode] = useState("");

  const updateProfile = useCallback(<K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setProfile((prev) => {
      const next = { ...prev, [key]: value } as ProfileData;
      if (key === "goal" || key === "weightKg" || key === "goalWeightKg") {
        return {
          ...next,
          goalWeightKg: normalizeGoalWeightForGoal(next.goal, next.weightKg, next.goalWeightKg),
        };
      }

      return next;
    });
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

    if (isGuestMode) {
      const draft = readOnboardingDraft();
      const merged = applyOnboardingDefaults(draft ?? defaultProfile, draft?.sex ?? "", draft?.age ?? null);
      setProfile(merged);
      setIsProteinTouched(merged.macroPreferences.proteinGPerKg !== null);
      setIsFatTouched(merged.macroPreferences.fatGPerKg !== null);
      setIsCutTouched(merged.macroPreferences.cutPercent !== null);
      setIsBulkTouched(merged.macroPreferences.bulkPercent !== null);
      setLoadState("ready");
      return;
    }

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
  }, [isGuestMode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!isGuestMode || loadState !== "ready") return;
    writeOnboardingDraft(profile);
  }, [isGuestMode, loadState, profile]);


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

  const trainingDaysOptions: Array<ChoiceOption<number>> = useMemo(
    () => [
      { value: 3, label: t("onboarding.trainingDays3") },
      { value: 4, label: t("onboarding.trainingDays4") },
      { value: 5, label: t("onboarding.trainingDays5") },
      { value: 6, label: t("onboarding.trainingDays6") },
    ],
    [t]
  );

  const mealsPerDayOptions: Array<ChoiceOption<number>> = useMemo(
    () => [
      { value: 3, label: t("onboarding.mealsPerDay3") },
      { value: 4, label: t("onboarding.mealsPerDay4") },
      { value: 5, label: t("onboarding.mealsPerDay5") },
    ],
    [t]
  );

  const stepDefinitions: StepDefinition[] = useMemo(
    () => [
      {
        eyebrow: t("onboarding.stepTransformation"),
        title: t("onboarding.objectiveTitle"),
        description: t("onboarding.objectiveDescription"),
      },
      {
        eyebrow: t("onboarding.stepIntro"),
        title: t("profile.basicsTitle"),
        description: t("onboarding.basicsDescription"),
      },
      {
        eyebrow: t("onboarding.stepIntro"),
        title: t("profile.basicsTitle"),
        description: t("profile.activity"),
      },
      {
        eyebrow: t("onboarding.stepTraining"),
        title: t("onboarding.trainingTitle"),
        description: t("onboarding.trainingDescription"),
      },
      {
        eyebrow: t("onboarding.stepTraining"),
        title: t("onboarding.trainingTitle"),
        description: t("profile.trainingSessionTime"),
      },
      {
        eyebrow: t("onboarding.stepTraining"),
        title: t("onboarding.trainingTitle"),
        description: t("profile.trainingFocus"),
      },
      {
        eyebrow: t("onboarding.stepNutrition"),
        title: t("onboarding.nutritionTitle"),
        description: t("onboarding.nutritionDescription"),
      },
      {
        eyebrow: t("onboarding.stepNutrition"),
        title: t("onboarding.nutritionTitle"),
        description: t("profile.dietTypeLabel"),
      },
      {
        eyebrow: t("onboarding.stepNutrition"),
        title: t("onboarding.nutritionTitle"),
        description: t("profile.mealDistributionLabel"),
      },
      {
        eyebrow: t("onboarding.stepAdherence"),
        title: t("profile.macroTitle"),
        description: t("onboarding.macroDescription"),
      },
      {
        eyebrow: t("onboarding.stepPreview"),
        title: t("onboarding.notesTitle"),
        description: t("onboarding.notesSubtitle"),
      },
      {
        eyebrow: t("onboarding.stepPreview"),
        title: t("onboarding.previewTitle"),
        description: t("onboarding.previewDescription"),
      },
    ],
    [t]
  );
  const currentStepDefinition = stepDefinitions[step] ?? stepDefinitions[FIRST_STEP];
  const pendingSummaryLabel = t("onboarding.summaryPending");
  const isMobileViewport = useMediaQuery("(max-width: 720px)");
  const useMobileChoiceSelect = lockViewport || isMobileViewport;
  const progressPercent = ((step + 1) / (LAST_STEP + 1)) * 100;
  const finishLabel = isGuestMode
    ? t("onboarding.activateBeta")
    : nextUrl || ai
      ? t("onboarding.finishAndContinue")
      : t("onboarding.finish");
  const closeLabel = t("ui.close");
  const returnHint = isGuestMode
    ? t("onboarding.returnHintGuest")
    : ai
      ? t("onboarding.returnHintAi")
      : nextUrl
        ? t("onboarding.returnHintNext")
        : t("onboarding.returnHintDefault");
  const goalLabel = resolveOptionLabel(profile.goal, objectiveOptions, pendingSummaryLabel);
  const focusLabel = resolveOptionLabel(profile.trainingPreferences.focus, trainingFocusOptions, pendingSummaryLabel);
  const equipmentLabel = resolveOptionLabel(profile.trainingPreferences.equipment, trainingEquipmentOptions, pendingSummaryLabel);
  const dietLabel = resolveOptionLabel(profile.nutritionPreferences.dietType, dietOptions, pendingSummaryLabel);
  const cookingTimeLabel = resolveOptionLabel(profile.nutritionPreferences.cookingTime, cookingTimeOptions, pendingSummaryLabel);
  const mealDistributionLabel = resolveOptionLabel(
    profile.nutritionPreferences.mealDistribution.preset,
    mealDistributionOptions,
    pendingSummaryLabel
  );
  const macroFormulaLabel = resolveOptionLabel(profile.macroPreferences.formula, macroFormulaOptions, pendingSummaryLabel);
  const sessionTimeLabel = resolveOptionLabel(profile.trainingPreferences.sessionTime, sessionTimeOptions, pendingSummaryLabel);
  const goalSummary = joinSummaryParts([
    goalLabel,
    hasPositiveNumber(profile.goalWeightKg)
      ? t("onboarding.summaryGoalTarget", { value: profile.goalWeightKg ?? 0 })
      : formatWeight(profile.weightKg, pendingSummaryLabel),
  ]);
  const trainingSummary = joinSummaryParts([
    hasPositiveNumber(profile.trainingPreferences.daysPerWeek)
      ? t("onboarding.summaryTrainingDays", { value: profile.trainingPreferences.daysPerWeek ?? 0 })
      : null,
    focusLabel !== pendingSummaryLabel ? focusLabel : null,
    equipmentLabel !== pendingSummaryLabel ? equipmentLabel : null,
  ]);
  const nutritionSummary = joinSummaryParts([
    hasPositiveNumber(profile.nutritionPreferences.mealsPerDay)
      ? t("onboarding.summaryMealsPerDay", { value: profile.nutritionPreferences.mealsPerDay ?? 0 })
      : null,
    dietLabel !== pendingSummaryLabel ? dietLabel : null,
    cookingTimeLabel !== pendingSummaryLabel ? cookingTimeLabel : null,
  ]);
  const adherenceSummary = joinSummaryParts([
    macroFormulaLabel !== pendingSummaryLabel ? macroFormulaLabel : null,
    sessionTimeLabel !== pendingSummaryLabel ? sessionTimeLabel : null,
    mealDistributionLabel !== pendingSummaryLabel ? mealDistributionLabel : null,
  ]);
  const serializedDraft = useMemo(
    () =>
      JSON.stringify({
        ...profile,
        goalWeightKg: normalizeGoalWeightForGoal(profile.goal, profile.weightKg, profile.goalWeightKg),
        macroPreferences: {
          ...profile.macroPreferences,
          formula: profile.macroPreferences.formula || "mifflin",
        },
      }),
    [profile]
  );
  const renderChoiceGroup = <T extends string | number,>(
    label: string,
    value: T | "",
    options: Array<ChoiceOption<T>>,
    onSelect: (next: T) => void,
    columns: "two" | "three" = "two",
    mobileVariant: "cards" | "auto" = "cards"
  ) => (
    <div className={styles.choiceGroup}>
      <span className={styles.choiceLabel}>{label}</span>
      <div
        className={`${styles.choiceGrid} ${columns === "three" ? styles.choiceGridThree : ""} ${
          useMobileChoiceSelect && mobileVariant === "auto" ? styles.choiceGridPills : ""
        }`}
      >
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={`${label}-${option.value}`}
              type="button"
              className={`${styles.choiceCard} ${isActive ? styles.choiceCardActive : ""} ${
                useMobileChoiceSelect && mobileVariant === "auto" ? styles.choiceCardPill : ""
              }`}
              onClick={() => onSelect(option.value)}
              aria-pressed={isActive}
            >
              <strong>{option.label}</strong>
              {option.hint ? <span>{option.hint}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  const goToNext = () => setStep((current) => Math.min(current + 1, LAST_STEP));
  const goToBack = () => {
    if (step === FIRST_STEP) {
      router.push(isGuestMode ? "/" : "/app/hoy");
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
    const profileToSave: ProfileData = {
      ...profile,
      goalWeightKg: normalizeGoalWeightForGoal(profile.goal, profile.weightKg, profile.goalWeightKg),
      macroPreferences: {
        ...profile.macroPreferences,
        formula: profile.macroPreferences.formula || "mifflin",
      },
    };

    if (isGuestMode) {
      writeOnboardingDraft(profileToSave);
      router.push(`/register?onboarding=1&next=${encodeURIComponent(nextUrl || "/app")}`);
      return;
    }

    setSaveState("saving");
    try {
      const savedProfile = await updateUserProfilePreferences(profileToSave);
      setProfile(savedProfile);
      setSaveState("success");
      trackEvent("onboarding_completed", { origin: "onboarding" });
    } catch {
      setSaveState("error");
    }
  }, [isGuestMode, nextUrl, profile, router]);

  const hasValidBasics =
    hasPositiveNumber(profile.age);
  const hasValidBodyMetrics = hasPositiveNumber(profile.heightCm) && hasPositiveNumber(profile.weightKg);
  const canFinishOnboarding = isProfileComplete({
    ...profile,
    macroPreferences: {
      ...profile.macroPreferences,
      formula: profile.macroPreferences.formula || "mifflin",
    },
  });
  const isStepValid =
    step === 0
      ? Boolean(profile.goal)
      : step === 1
        ? hasValidBasics
        : step === 2
          ? hasValidBodyMetrics
        : step === LAST_STEP
          ? canFinishOnboarding
          : true;
  const canActivateGuest =
    canFinishOnboarding &&
    activationEmail.trim().length > 3 &&
    activationPassword.trim().length >= 8 &&
    activationPromoCode.trim().length > 0;
  const isMaintainGoal = profile.goal === "maintain";

  if (loadState === "loading") {
    return (
        <div className={`page ${styles.pageShell} ${lockViewport ? styles.viewportLocked : ""}`}>
        <LoadingState
          title={t("onboarding.title")}
          ariaLabel={t("onboarding.loadingState")}
          lines={4}
          cardClassName={styles.stageCard}
        />
      </div>
    );
  }

  if (loadState === "error") {
    return (
        <div className={`page ${styles.pageShell} ${lockViewport ? styles.viewportLocked : ""}`}>
        <ErrorState
          title={t("onboarding.errorTitle")}
          description={t("onboarding.errorSubtitle")}
          retryLabel={t("onboarding.retry")}
          onRetry={() => void loadProfile()}
          wrapInCard
          cardClassName={styles.stageCard}
          actions={[{ label: t("onboarding.back"), onClick: () => router.push("/app/hoy"), variant: "ghost" }]}
        />
      </div>
    );
  }

  if (loadState === "empty") {
    return (
        <div className={`page ${styles.pageShell} ${lockViewport ? styles.viewportLocked : ""}`}>
        <EmptyState
          title={t("onboarding.emptyTitle")}
          description={t("onboarding.emptySubtitle")}
          wrapInCard
          cardClassName={styles.stageCard}
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
        <div className={`page ${styles.pageShell} ${lockViewport ? styles.viewportLocked : ""}`}>
        <EmptyState
          title={t("onboarding.successTitle")}
          description={t("onboarding.successSubtitle")}
          icon="check"
          wrapInCard
          cardClassName={styles.stageCard}
          actions={[{ label: t("onboarding.continue"), onClick: continueAfterSuccess }]}
        />
      </div>
    );
  }

  return (
    <div className={`page ${styles.pageShell} ${lockViewport ? styles.viewportLocked : ""}`}>
      <div className={styles.container}>
        <header className={styles.topBar}>
          <button
            type="button"
            className={`btn secondary fit-content ${styles.navButton}`}
            onClick={goToBack}
            aria-label={t("onboarding.back")}
          >
            <span aria-hidden="true">&lt;</span>
          </button>
          <div className={styles.topBarCenter}>
            <p className={styles.brandLabel}>{t("onboarding.title")}</p>
            <div
              className={styles.progressPill}
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={LAST_STEP + 1}
              aria-valuenow={step + 1}
              aria-label={t("onboarding.stepCounter", { current: step + 1, total: LAST_STEP + 1 })}
            >
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <p className={styles.progressCopy}>{t("onboarding.stepCounter", { current: step + 1, total: LAST_STEP + 1 })}</p>
          </div>
          <button
            type="button"
            className={`btn secondary fit-content ${styles.closeButton}`}
            onClick={() => router.push("/login")}
            aria-label={closeLabel}
          >
            <span aria-hidden="true">x</span>
          </button>
        </header>

        {isGuestMode ? (
          <div className={styles.metaRow}>
            <span className={styles.betaBadge}>{t("auth.activateBetaBadge")}</span>
          </div>
        ) : null}

        <section className={`card ${styles.stageCard}`}>
          <div className={styles.stageIntro}>
            <p className={styles.stageEyebrow}>{currentStepDefinition.eyebrow}</p>
            <h1 className={styles.stageTitle}>{currentStepDefinition.title}</h1>
            <p className={styles.stageSubtitle}>{currentStepDefinition.description}</p>
            <p className={styles.returnHint}>{returnHint}</p>
          </div>

          {step === 0 ? (
            <div className={styles.stageContent}>
              {renderChoiceGroup(t("profile.goal"), profile.goal, objectiveOptions, (next) => updateProfile("goal", next as Goal), "three")}
              <Input
                variant="premium"
                type="number"
                label={t("profile.goalWeight")}
                value={profile.goalWeightKg ?? ""}
                onChange={(e) => updateProfile("goalWeightKg", parseNumberInput(e.target.value))}
                disabled={isMaintainGoal}
                helperText={isMaintainGoal ? t("profile.goalWeightMaintainHint") : t("onboarding.goalWeightHint")}
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div className={styles.stageContent}>
              <Input variant="premium" label={t("profile.name")} value={profile.name} onChange={(e) => updateProfile("name", e.target.value)} />
              {renderChoiceGroup(
                t("profile.sex"),
                profile.sex,
                [
                  { value: "male", label: t("profile.sexMale") },
                  { value: "female", label: t("profile.sexFemale") },
                ],
                (next) => {
                  const nextSex = next as Sex;
                  setProfile((prev) => applyOnboardingDefaults({ ...prev, sex: nextSex }, nextSex, prev.age));
                }
              )}
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
            </div>
          ) : null}

          {step === 2 ? (
            <div className={styles.stageContent}>
              <div className={styles.metricGrid}>
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
              </div>
              {renderChoiceGroup(
                t("profile.activity"),
                profile.activity,
                activityOptions,
                (next) => updateProfile("activity", next as Activity),
                "three",
                "auto"
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className={styles.stageContent}>
              {renderChoiceGroup(
                t("profile.trainingDays"),
                profile.trainingPreferences.daysPerWeek ?? "",
                trainingDaysOptions,
                (next) => updateTrainingPreference("daysPerWeek", next as number),
                "three"
              )}
              {renderChoiceGroup(
                t("profile.trainingLevel"),
                profile.trainingPreferences.level,
                levelOptions,
                (next) => updateTrainingPreference("level", next as TrainingLevel),
                "three"
              )}
            </div>
          ) : null}

          {step === 4 ? (
            <div className={styles.stageContent}>
              {renderChoiceGroup(
                t("profile.trainingSessionTime"),
                profile.trainingPreferences.sessionTime,
                sessionTimeOptions,
                (next) => updateTrainingPreference("sessionTime", next as SessionTime),
                "three"
              )}
            </div>
          ) : null}

          {step === 5 ? (
            <div className={styles.stageContent}>
              {renderChoiceGroup(
                t("profile.trainingEquipment"),
                profile.trainingPreferences.equipment,
                trainingEquipmentOptions,
                (next) => updateTrainingPreference("equipment", next as TrainingEquipment)
              )}
              {renderChoiceGroup(
                t("profile.trainingFocus"),
                profile.trainingPreferences.focus,
                trainingFocusOptions,
                (next) => updateTrainingPreference("focus", next as TrainingFocus),
                "three"
              )}
            </div>
          ) : null}

          {step === 6 ? (
            <div className={styles.stageContent}>
              {renderChoiceGroup(
                t("profile.mealsPerDay"),
                profile.nutritionPreferences.mealsPerDay ?? "",
                mealsPerDayOptions,
                (next) => updateNutritionPreference("mealsPerDay", next as number),
                "three"
              )}
            </div>
          ) : null}

          {step === 7 ? (
            <div className={styles.stageContent}>
              {renderChoiceGroup(
                t("profile.dietTypeLabel"),
                profile.nutritionPreferences.dietType,
                dietOptions,
                (next) => updateNutritionPreference("dietType", next as NutritionDietType),
                "three",
                "auto"
              )}
            </div>
          ) : null}

          {step === 8 ? (
            <div className={styles.stageContent}>
              {renderChoiceGroup(
                t("profile.cookingTime"),
                profile.nutritionPreferences.cookingTime,
                cookingTimeOptions,
                (next) => updateNutritionPreference("cookingTime", next as NutritionCookingTime),
                "three"
              )}
              {renderChoiceGroup(
                t("profile.mealDistributionLabel"),
                profile.nutritionPreferences.mealDistribution.preset,
                mealDistributionOptions,
                (next) => updateNutritionPreference("mealDistribution", { preset: next as MealDistributionPreset }),
                "three"
              )}
            </div>
          ) : null}

          {step === 9 ? (
            <div className={styles.stageContent}>
              {renderChoiceGroup(
                t("profile.macroFormula"),
                profile.macroPreferences.formula,
                macroFormulaOptions,
                (next) => {
                  const nextFormula = next as MacroFormula;
                  updateMacroPreference("formula", nextFormula);
                  const defaults = FORMULA_DEFAULTS[nextFormula];
                  if (!isProteinTouched) updateMacroPreference("proteinGPerKg", defaults.proteinGPerKg);
                  if (!isFatTouched) updateMacroPreference("fatGPerKg", defaults.fatGPerKg);
                  if (!isCutTouched) updateMacroPreference("cutPercent", defaults.cutPercent);
                  if (!isBulkTouched) updateMacroPreference("bulkPercent", defaults.bulkPercent);
                }
              )}
              <label className={styles.toggleRow}>
                <input type="checkbox" checked={showAdvancedMacros} onChange={(e) => setShowAdvancedMacros(e.target.checked)} />
                <span>{t("profile.macroAdvancedToggle")}</span>
              </label>
              {showAdvancedMacros ? (
                <div className={styles.metricGrid}>
                  <Input
                    variant="premium"
                    type="number"
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
                    label={t("profile.macroBulkPercent")}
                    helperText={t("profile.macroBulkPercentPlaceholder")}
                    value={profile.macroPreferences.bulkPercent ?? ""}
                    onChange={(e) => {
                      setIsBulkTouched(true);
                      updateMacroPreference("bulkPercent", parseNumberInput(e.target.value));
                    }}
                  />
                </div>
              ) : (
                <p className={styles.microHint}>{t("onboarding.macroHint")}</p>
              )}
            </div>
          ) : null}

          {step === 10 ? (
            <div className={styles.stageContent}>
              <div className={styles.notesBlock}>
                <h3>{t("onboarding.notesTitle")}</h3>
                <p>{t("onboarding.notesSubtitle")}</p>
                <label className="form-stack">
                  {t("profile.injuriesLabel")}
                  <textarea value={profile.injuries} onChange={(e) => updateProfile("injuries", e.target.value)} />
                </label>
                <label className="form-stack">
                  {t("profile.notes")}
                  <textarea value={profile.notes} onChange={(e) => updateProfile("notes", e.target.value)} />
                </label>
              </div>
            </div>
          ) : null}

          {step === LAST_STEP ? (
            <div className={styles.stageContent}>
              <div className={styles.previewHero}>
                <div>
                  <p className={styles.previewEyebrow}>{t("onboarding.stepPreview")}</p>
                  <h2 className={styles.previewTitle}>{t("onboarding.previewTitle")}</h2>
                </div>
                <p className={styles.previewSubtitle}>{t("onboarding.previewSubtitle")}</p>
              </div>

              <div className={styles.summaryGrid}>
                <article className={styles.summaryCard}>
                  <span>{t("onboarding.summaryGoalLabel")}</span>
                  <strong>{goalSummary || pendingSummaryLabel}</strong>
                  <small>{t("onboarding.summaryGoalSupport")}</small>
                </article>
                <article className={styles.summaryCard}>
                  <span>{t("onboarding.summaryTrainingLabel")}</span>
                  <strong>{trainingSummary || pendingSummaryLabel}</strong>
                  <small>{t("onboarding.summaryTrainingSupport")}</small>
                </article>
                <article className={styles.summaryCard}>
                  <span>{t("onboarding.summaryNutritionLabel")}</span>
                  <strong>{nutritionSummary || pendingSummaryLabel}</strong>
                  <small>{t("onboarding.summaryNutritionSupport")}</small>
                </article>
                <article className={styles.summaryCard}>
                  <span>{t("onboarding.summaryAdherenceLabel")}</span>
                  <strong>{adherenceSummary || pendingSummaryLabel}</strong>
                  <small>{t("onboarding.summaryAdherenceSupport")}</small>
                </article>
              </div>

              {isGuestMode ? (
                <div className={styles.activationPanel}>
                  <div className={styles.activationHeader}>
                    <span className={styles.betaBadge}>{t("auth.activateBetaBadge")}</span>
                    <h3>{t("auth.activateBetaTitle")}</h3>
                    <p>{t("auth.activateBetaSubtitle")}</p>
                  </div>

                  {activationError ? (
                    <div className="status-card status-card--warning" role="alert">
                      <p className="muted m-0">{activationError === "promo" ? t("auth.promoError") : t("auth.registerError")}</p>
                    </div>
                  ) : null}

                  {!canFinishOnboarding ? (
                    <div className="status-card status-card--warning" role="alert">
                      <p className="muted m-0">{t("onboarding.completeBeforeActivation")}</p>
                    </div>
                  ) : null}

                  {activationAction ? (
                    <form action={activationAction} className={styles.activationForm}>
                      <input type="hidden" name="next" value={nextUrl ?? "/app"} />
                      <input type="hidden" name="profileDraft" value={serializedDraft} />
                      <input type="hidden" name="source" value="onboarding" />
                      <input type="hidden" name="name" value={profile.name} />
                      <Input
                        variant="premium"
                        name="email"
                        type="email"
                        label={t("auth.email")}
                        helperText={t("auth.emailHelper")}
                        value={activationEmail}
                        onChange={(e) => setActivationEmail(e.target.value)}
                        required
                      />
                      <Input
                        variant="premium"
                        name="password"
                        type="password"
                        label={t("auth.password")}
                        helperText={t("auth.passwordHelper")}
                        value={activationPassword}
                        onChange={(e) => setActivationPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                      <Input
                        variant="premium"
                        name="promoCode"
                        type="text"
                        label={t("auth.promoCode")}
                        helperText={t("auth.promoHelper")}
                        value={activationPromoCode}
                        onChange={(e) => setActivationPromoCode(e.target.value)}
                        required
                      />
                      <button type="submit" className="btn" disabled={!canActivateGuest}>
                        {t("auth.activateBetaSubmit")}
                      </button>
                    </form>
                  ) : (
                    <button type="button" className="btn" onClick={() => void saveProfile()}>
                      {finishLabel}
                    </button>
                  )}
                </div>
              ) : (
                <div className={styles.previewBanner}>
                  <p>{t("onboarding.previewBanner")}</p>
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section className={`card ${styles.footerCard}`}>
          {saveState === "error" ? (
            <div className="status-card status-card--warning" role="alert">
              <p className="muted m-0">{t("onboarding.saveError")}</p>
              <div className="inline-actions-sm mt-8">
                <button type="button" className="btn secondary fit-content" onClick={() => void saveProfile()}>
                  {t("onboarding.retry")}
                </button>
              </div>
            </div>
          ) : null}
          <div className={styles.footerActions}>
            <button type="button" className="btn secondary" onClick={goToBack} disabled={saveState === "saving"}>
              {t("onboarding.back")}
            </button>
            {step < LAST_STEP ? (
              <button type="button" className="btn" onClick={goToNext} disabled={!isStepValid || saveState === "saving"}>
                {t("onboarding.next")}
              </button>
            ) : !isGuestMode ? (
              <button type="button" className="btn" onClick={() => void saveProfile()} disabled={!isStepValid || saveState === "saving"}>
                {saveState === "saving" ? t("onboarding.saving") : finishLabel}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
