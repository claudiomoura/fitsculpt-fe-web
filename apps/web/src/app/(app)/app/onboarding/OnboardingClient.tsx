"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
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
  type TimerSound,
  type TrainingEquipment,
  type TrainingFocus,
  type TrainingLevel,
  type WorkoutLength,
} from "@/lib/profile";
import { mergeProfileData } from "@/lib/profileService";

type Props = {
  nextUrl?: string;
  ai?: string;
};

type LoadState = "loading" | "ready" | "empty" | "error";
type SaveState = "idle" | "saving" | "success" | "error";

const FIRST_STEP = 0;
const LAST_STEP = 5;

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

export default function OnboardingClient({ nextUrl, ai }: Props) {
  const { t } = useLanguage();
  const router = useRouter();

  const safeLabel = useCallback(
    (key: string, fallback: string) => {
      const label = t(key);
      return label === key ? fallback : label;
    },
    [t]
  );

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

  const updateMeasurement = useCallback(
    <K extends keyof ProfileData["measurements"]>(key: K, value: ProfileData["measurements"][K]) => {
      setProfile((prev) => ({
        ...prev,
        measurements: {
          ...prev.measurements,
          [key]: value,
        },
      }));
    },
    []
  );

  const loadProfile = useCallback(async () => {
    setLoadState("loading");
    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      if (!response.ok) {
        setLoadState("error");
        return;
      }

      const data = (await response.json()) as Partial<ProfileData> | null;
      const merged = mergeProfileData(data ?? undefined);
      setProfile(merged);
      setIsProteinTouched(merged.macroPreferences.proteinGPerKg !== null);
      setIsFatTouched(merged.macroPreferences.fatGPerKg !== null);
      setIsCutTouched(merged.macroPreferences.cutPercent !== null);
      setIsBulkTouched(merged.macroPreferences.bulkPercent !== null);
      setLoadState(data && Object.keys(data).length > 0 ? "ready" : "empty");
    } catch (_err) {
      setLoadState("error");
    }
  }, []);

  useState(() => {
    void loadProfile();
  });


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

  const workoutLengthOptions: Array<{ value: WorkoutLength; label: string }> = useMemo(
    () => [
      { value: "30m", label: t("profile.workoutLength30") },
      { value: "45m", label: t("profile.workoutLength45") },
      { value: "60m", label: t("profile.workoutLength60") },
      { value: "flexible", label: t("profile.workoutLengthFlexible") },
    ],
    [t]
  );

  const timerSoundOptions: Array<{ value: TimerSound; label: string }> = useMemo(
    () => [
      { value: "ding", label: t("profile.timerSoundDing") },
      { value: "repsToDo", label: t("profile.timerSoundReps") },
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
      router.push("/app");
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
    router.push("/app");
  };

  const saveProfile = useCallback(async () => {
    setSaveState("saving");
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        setSaveState("error");
        return;
      }

      const data = (await response.json()) as Partial<ProfileData> | null;
      setProfile(mergeProfileData(data ?? profile));
      setSaveState("success");
    } catch (_err) {
      setSaveState("error");
    }
  }, [profile]);

  const isStepValid =
    (step === 0 &&
      hasPositiveNumber(profile.age) &&
      hasPositiveNumber(profile.heightCm) &&
      hasPositiveNumber(profile.weightKg)) ||
    (step === 4 && Boolean(profile.macroPreferences.formula)) ||
    (step > 0 && step !== 4);

  if (loadState === "loading") {
    return <div className="page"><section className="card"><h2 className="section-title">{t("onboarding.title")}</h2><p className="section-subtitle">{t("onboarding.loadingState")}</p></section></div>;
  }

  if (loadState === "error") {
    return <div className="page"><section className="card form-stack"><h2 className="section-title">{t("onboarding.errorTitle")}</h2><p className="section-subtitle">{t("onboarding.errorSubtitle")}</p><div style={{ display: "flex", gap: 10 }}><button type="button" className="btn" onClick={() => void loadProfile()}>{t("onboarding.retry")}</button><button type="button" className="btn secondary" onClick={() => router.push("/app")}>{t("onboarding.back")}</button></div></section></div>;
  }

  if (loadState === "empty") {
    return <div className="page"><section className="card form-stack"><h2 className="section-title">{t("onboarding.emptyTitle")}</h2><p className="section-subtitle">{t("onboarding.emptySubtitle")}</p><div style={{ display: "flex", gap: 10 }}><button type="button" className="btn" onClick={() => setLoadState("ready")}>{t("onboarding.emptyAction")}</button><button type="button" className="btn secondary" onClick={() => void loadProfile()}>{t("onboarding.retry")}</button></div></section></div>;
  }

  if (saveState === "success") {
    return <div className="page"><section className="card form-stack"><h2 className="section-title">{t("onboarding.successTitle")}</h2><p className="section-subtitle">{t("onboarding.successSubtitle")}</p><button type="button" className="btn" onClick={continueAfterSuccess}>{t("onboarding.continue")}</button></section></div>;
  }

  return (
    <div className="page">
      <section className="card">
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("onboarding.title")}</h2>
        <p className="section-subtitle">{t("onboarding.subtitle")}</p>
        <p className="muted" style={{ marginTop: 8 }}>{t("onboarding.stepCounter", { current: step + 1, total: LAST_STEP + 1 })}</p>
      </section>

      {step === 0 && <section className="card form-stack"><h3 className="section-title">{t("profile.basicsTitle")}</h3>
        <label className="form-stack">{t("profile.name")}<input value={profile.name} onChange={(e) => updateProfile("name", e.target.value)} /></label>
        <label className="form-stack">{t("profile.sex")}<select value={profile.sex} onChange={(e) => updateProfile("sex", e.target.value as Sex | "")}><option value="">{t("profile.selectPlaceholder")}</option><option value="male">{t("profile.sexMale")}</option><option value="female">{t("profile.sexFemale")}</option></select></label>
        <label className="form-stack">{renderFieldLabel(t("profile.age"), true)}<input type="number" value={profile.age ?? ""} onChange={(e) => updateProfile("age", parseNumberInput(e.target.value))} /></label>
        <label className="form-stack">{renderFieldLabel(t("profile.height"), true)}<input type="number" value={profile.heightCm ?? ""} onChange={(e) => updateProfile("heightCm", parseNumberInput(e.target.value))} /></label>
        <label className="form-stack">{renderFieldLabel(t("profile.weight"), true)}<input type="number" value={profile.weightKg ?? ""} onChange={(e) => updateProfile("weightKg", parseNumberInput(e.target.value))} /></label>
        <label className="form-stack">{t("profile.activity")}<select value={profile.activity} onChange={(e) => updateProfile("activity", e.target.value as Activity | "")}><option value="">{t("profile.selectPlaceholder")}</option>{activityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </section>}

      {step === 1 && <section className="card form-stack"><h3 className="section-title">{t("onboarding.objectiveTitle")}</h3>
      <label className="form-stack">{t("profile.goal")}<select value={profile.goal} onChange={(event) => updateProfile("goal", event.target.value as Goal | "")}><option value="">{t("profile.selectPlaceholder")}</option>{objectiveOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="form-stack">{t("profile.goalWeight")}<input type="number" value={profile.goalWeightKg ?? ""} onChange={(e) => updateProfile("goalWeightKg", parseNumberInput(e.target.value))} /></label>
      </section>}

      {step === 2 && <section className="card form-stack"><h3 className="section-title">{t("onboarding.levelTitle")}</h3>
      <label className="form-stack">{t("profile.trainingLevel")}<select value={profile.trainingPreferences.level} onChange={(e) => updateTrainingPreference("level", e.target.value as TrainingLevel | "")}><option value="">{t("profile.selectPlaceholder")}</option>{levelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="form-stack">{t("profile.trainingDays")}<input type="number" value={profile.trainingPreferences.daysPerWeek ?? ""} onChange={(e) => updateTrainingPreference("daysPerWeek", parseNumberInput(e.target.value))} /></label>
      <label className="form-stack">{t("profile.trainingSessionTime")}<select value={profile.trainingPreferences.sessionTime} onChange={(e) => updateTrainingPreference("sessionTime", e.target.value as SessionTime | "")}><option value="">{t("profile.selectPlaceholder")}</option>{sessionTimeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="form-stack">{t("profile.trainingFocus")}<select value={profile.trainingPreferences.focus} onChange={(e) => updateTrainingPreference("focus", e.target.value as TrainingFocus | "")}><option value="">{t("profile.selectPlaceholder")}</option>{trainingFocusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="form-stack">{t("profile.trainingEquipment")}<select value={profile.trainingPreferences.equipment} onChange={(e) => updateTrainingPreference("equipment", e.target.value as TrainingEquipment | "")}><option value="">{t("profile.selectPlaceholder")}</option>{trainingEquipmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="form-stack">{t("profile.workoutLength")}<select value={profile.trainingPreferences.workoutLength} onChange={(e) => updateTrainingPreference("workoutLength", e.target.value as WorkoutLength | "")}><option value="">{t("profile.selectPlaceholder")}</option>{workoutLengthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="form-stack">{t("profile.timerSound")}<select value={profile.trainingPreferences.timerSound} onChange={(e) => updateTrainingPreference("timerSound", e.target.value as TimerSound | "")}><option value="">{t("profile.selectPlaceholder")}</option>{timerSoundOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </section>}

      {step === 3 && <section className="card form-stack"><h3 className="section-title">{t("onboarding.preferencesTitle")}</h3>
      <label className="form-stack">{t("profile.mealsPerDay")}<input type="number" value={profile.nutritionPreferences.mealsPerDay ?? ""} onChange={(e) => updateNutritionPreference("mealsPerDay", parseNumberInput(e.target.value))} /></label>
      <label className="form-stack">{t("profile.dietType")}<select value={profile.nutritionPreferences.dietType} onChange={(event) => updateNutritionPreference("dietType", event.target.value as NutritionDietType | "")}><option value="">{t("profile.selectPlaceholder")}</option>{dietOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="form-stack">{t("profile.cookingTime")}<select value={profile.nutritionPreferences.cookingTime} onChange={(e) => updateNutritionPreference("cookingTime", e.target.value as NutritionCookingTime | "")}><option value="">{t("profile.selectPlaceholder")}</option>{cookingTimeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="form-stack">{t("profile.mealDistributionLabel")}<select value={profile.nutritionPreferences.mealDistribution.preset} onChange={(event) => updateNutritionPreference("mealDistribution", { preset: event.target.value as MealDistributionPreset | "" })}><option value="">{t("profile.selectPlaceholder")}</option>{mealDistributionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </section>}

      {step === 4 && <section className="card form-stack"><h3 className="section-title">{t("profile.macroTitle")}</h3>
      <label className="form-stack">{renderFieldLabel(t("profile.macroFormula"), true)}<select value={profile.macroPreferences.formula} onChange={(e) => {
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
      }}><option value="">{t("profile.selectPlaceholder")}</option>{macroFormulaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="checkbox-row"><input type="checkbox" checked={showAdvancedMacros} onChange={(e) => setShowAdvancedMacros(e.target.checked)} />{t("profile.macroAdvancedToggle")}</label>
      <label className="form-stack">{t("profile.macroProtein")}<input type="number" disabled={!showAdvancedMacros} placeholder={t("profile.macroProteinPlaceholder")} value={profile.macroPreferences.proteinGPerKg ?? ""} onChange={(e) => { setIsProteinTouched(true); updateMacroPreference("proteinGPerKg", parseNumberInput(e.target.value)); }} /></label>
      <label className="form-stack">{t("profile.macroFat")}<input type="number" disabled={!showAdvancedMacros} placeholder={t("profile.macroFatPlaceholder")} value={profile.macroPreferences.fatGPerKg ?? ""} onChange={(e) => { setIsFatTouched(true); updateMacroPreference("fatGPerKg", parseNumberInput(e.target.value)); }} /></label>
      <label className="form-stack">{t("profile.macroCutPercent")}<input type="number" disabled={!showAdvancedMacros} placeholder={t("profile.macroCutPercentPlaceholder")} value={profile.macroPreferences.cutPercent ?? ""} onChange={(e) => { setIsCutTouched(true); updateMacroPreference("cutPercent", parseNumberInput(e.target.value)); }} /></label>
      <label className="form-stack">{t("profile.macroBulkPercent")}<input type="number" disabled={!showAdvancedMacros} placeholder={t("profile.macroBulkPercentPlaceholder")} value={profile.macroPreferences.bulkPercent ?? ""} onChange={(e) => { setIsBulkTouched(true); updateMacroPreference("bulkPercent", parseNumberInput(e.target.value)); }} /></label>
      <label className="form-stack">{safeLabel("tracking.chestCm", "Chest (cm)")}<input type="number" value={profile.measurements.chestCm ?? ""} onChange={(e) => updateMeasurement("chestCm", parseNumberInput(e.target.value))} /></label>
      <label className="form-stack">{safeLabel("tracking.waistCm", "Waist (cm)")}<input type="number" value={profile.measurements.waistCm ?? ""} onChange={(e) => updateMeasurement("waistCm", parseNumberInput(e.target.value))} /></label>
      <label className="form-stack">{safeLabel("tracking.hipsCm", "Hips (cm)")}<input type="number" value={profile.measurements.hipsCm ?? ""} onChange={(e) => updateMeasurement("hipsCm", parseNumberInput(e.target.value))} /></label>
      <label className="form-stack">{safeLabel("tracking.bicepsCm", "Biceps (cm)")}<input type="number" value={profile.measurements.bicepsCm ?? ""} onChange={(e) => updateMeasurement("bicepsCm", parseNumberInput(e.target.value))} /></label>
      <label className="form-stack">{safeLabel("tracking.thighCm", "Thigh (cm)")}<input type="number" value={profile.measurements.thighCm ?? ""} onChange={(e) => updateMeasurement("thighCm", parseNumberInput(e.target.value))} /></label>
      <label className="form-stack">{safeLabel("tracking.calfCm", "Calf (cm)")}<input type="number" value={profile.measurements.calfCm ?? ""} onChange={(e) => updateMeasurement("calfCm", parseNumberInput(e.target.value))} /></label>
      <label className="form-stack">{safeLabel("tracking.neckCm", "Neck (cm)")}<input type="number" value={profile.measurements.neckCm ?? ""} onChange={(e) => updateMeasurement("neckCm", parseNumberInput(e.target.value))} /></label>
      <label className="form-stack">{safeLabel("tracking.bodyFatPercent", "Body fat (%)")}<input type="number" value={profile.measurements.bodyFatPercent ?? ""} onChange={(e) => updateMeasurement("bodyFatPercent", parseNumberInput(e.target.value))} /></label>
      </section>}

      {step === 5 && <section className="card form-stack"><h3 className="section-title">{t("profile.notes")}</h3>
      <label className="form-stack">{t("profile.injuriesLabel")}<textarea value={profile.injuries} onChange={(e) => updateProfile("injuries", e.target.value)} /></label>
      <label className="form-stack">{t("profile.notes")}<textarea value={profile.notes} onChange={(e) => updateProfile("notes", e.target.value)} /></label>
      <label className="form-stack">{t("profile.preferredFoods")}<textarea value={profile.nutritionPreferences.preferredFoods} onChange={(e) => updateNutritionPreference("preferredFoods", e.target.value)} /></label>
      <label className="form-stack">{t("profile.dislikedFoods")}<textarea value={profile.nutritionPreferences.dislikedFoods} onChange={(e) => updateNutritionPreference("dislikedFoods", e.target.value)} /></label>
      <label className="form-stack">{t("profile.dietaryPrefs")}<textarea value={profile.nutritionPreferences.dietaryPrefs} onChange={(e) => updateNutritionPreference("dietaryPrefs", e.target.value)} /></label>
      </section>}

      <section className="card form-stack">
        {saveState === "error" && <div className="form-stack" role="alert"><p className="section-subtitle">{t("onboarding.saveError")}</p><button type="button" className="btn secondary" onClick={() => void saveProfile()}>{t("onboarding.retry")}</button></div>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn secondary" onClick={goToBack} disabled={saveState === "saving"}>{t("onboarding.back")}</button>
          {step < LAST_STEP ? <button type="button" className="btn" onClick={goToNext} disabled={!isStepValid || saveState === "saving"}>{t("onboarding.next")}</button> : <button type="button" className="btn" onClick={() => void saveProfile()} disabled={!isStepValid || saveState === "saving"}>{saveState === "saving" ? t("onboarding.saving") : t("onboarding.finish")}</button>}
        </div>
      </section>
    </div>
  );
}
