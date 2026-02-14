"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import {
  defaultProfile,
  type Goal,
  type MealDistributionPreset,
  type NutritionDietType,
  type ProfileData,
  type TrainingLevel,
} from "@/lib/profile";
import { mergeProfileData } from "@/lib/profileService";

type Props = {
  nextUrl?: string;
  ai?: string;
};

type LoadState = "loading" | "ready" | "empty" | "error";
type SaveState = "idle" | "saving" | "success" | "error";

const FIRST_STEP = 0;
const LAST_STEP = 2;

export default function OnboardingClient({ nextUrl, ai }: Props) {
  const { t } = useLanguage();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [step, setStep] = useState<number>(FIRST_STEP);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const updateProfile = useCallback(<K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateTrainingLevel = useCallback((value: TrainingLevel | "") => {
    setProfile((prev) => ({
      ...prev,
      trainingPreferences: {
        ...prev.trainingPreferences,
        level: value,
      },
    }));
  }, []);

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
      setLoadState(data && Object.keys(data).length > 0 ? "ready" : "empty");
    } catch {
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

  const levelOptions: Array<{ value: TrainingLevel; label: string }> = useMemo(
    () => [
      { value: "beginner", label: t("profile.trainingLevelBeginner") },
      { value: "intermediate", label: t("profile.trainingLevelIntermediate") },
      { value: "advanced", label: t("profile.trainingLevelAdvanced") },
    ],
    [t]
  );

  const dietOptions: Array<{ value: NutritionDietType; label: string }> = useMemo(
    () => [
      { value: "balanced", label: t("profile.dietTypeBalanced") },
      { value: "mediterranean", label: t("profile.dietTypeMediterranean") },
      { value: "keto", label: t("profile.dietTypeKeto") },
      { value: "vegetarian", label: t("profile.dietTypeVegetarian") },
      { value: "vegan", label: t("profile.dietTypeVegan") },
      { value: "pescatarian", label: t("profile.dietTypePescatarian") },
      { value: "paleo", label: t("profile.dietTypePaleo") },
      { value: "flexible", label: t("profile.dietTypeFlexible") },
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
    } catch {
      setSaveState("error");
    }
  }, [profile]);

  const isStepValid =
    (step === 0 && profile.goal !== "") ||
    (step === 1 && profile.trainingPreferences.level !== "") ||
    (step === 2 && profile.nutritionPreferences.dietType !== "" && profile.nutritionPreferences.mealDistribution.preset !== "");

  if (loadState === "loading") {
    return (
      <div className="page">
        <section className="card">
          <h2 className="section-title">{t("onboarding.title")}</h2>
          <p className="section-subtitle">{t("onboarding.loadingState")}</p>
        </section>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="page">
        <section className="card form-stack">
          <h2 className="section-title">{t("onboarding.errorTitle")}</h2>
          <p className="section-subtitle">{t("onboarding.errorSubtitle")}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn" onClick={() => void loadProfile()}>
              {t("onboarding.retry")}
            </button>
            <button type="button" className="btn secondary" onClick={() => router.push("/app")}>
              {t("onboarding.back")}
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (loadState === "empty") {
    return (
      <div className="page">
        <section className="card form-stack">
          <h2 className="section-title">{t("onboarding.emptyTitle")}</h2>
          <p className="section-subtitle">{t("onboarding.emptySubtitle")}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn" onClick={() => setLoadState("ready")}>
              {t("onboarding.emptyAction")}
            </button>
            <button type="button" className="btn secondary" onClick={() => void loadProfile()}>
              {t("onboarding.retry")}
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (saveState === "success") {
    return (
      <div className="page">
        <section className="card form-stack">
          <h2 className="section-title">{t("onboarding.successTitle")}</h2>
          <p className="section-subtitle">{t("onboarding.successSubtitle")}</p>
          <button type="button" className="btn" onClick={continueAfterSuccess}>
            {t("onboarding.continue")}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="card">
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("onboarding.title")}</h2>
        <p className="section-subtitle">{t("onboarding.subtitle")}</p>
        <p className="muted" style={{ marginTop: 8 }}>
          {t("onboarding.stepCounter", { current: step + 1, total: LAST_STEP + 1 })}
        </p>
      </section>

      {step === 0 && (
        <section className="card form-stack">
          <h3 className="section-title">{t("onboarding.objectiveTitle")}</h3>
          <label className="form-stack">
            {t("profile.goal")}
            <select value={profile.goal} onChange={(event) => updateProfile("goal", event.target.value as Goal | "")}>
              <option value="">{t("profile.selectPlaceholder")}</option>
              {objectiveOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}

      {step === 1 && (
        <section className="card form-stack">
          <h3 className="section-title">{t("onboarding.levelTitle")}</h3>
          <label className="form-stack">
            {t("profile.trainingLevel")}
            <select value={profile.trainingPreferences.level} onChange={(event) => updateTrainingLevel(event.target.value as TrainingLevel | "")}>
              <option value="">{t("profile.selectPlaceholder")}</option>
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}

      {step === 2 && (
        <section className="card form-stack">
          <h3 className="section-title">{t("onboarding.preferencesTitle")}</h3>
          <label className="form-stack">
            {t("profile.dietType")}
            <select
              value={profile.nutritionPreferences.dietType}
              onChange={(event) => updateNutritionPreference("dietType", event.target.value as NutritionDietType | "")}
            >
              <option value="">{t("profile.selectPlaceholder")}</option>
              {dietOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-stack">
            {t("profile.mealDistributionLabel")}
            <select
              value={profile.nutritionPreferences.mealDistribution.preset}
              onChange={(event) =>
                updateNutritionPreference("mealDistribution", {
                  preset: event.target.value as MealDistributionPreset | "",
                })
              }
            >
              <option value="">{t("profile.selectPlaceholder")}</option>
              {mealDistributionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}

      <section className="card form-stack">
        {saveState === "error" && (
          <div className="form-stack" role="alert">
            <p className="section-subtitle">{t("onboarding.saveError")}</p>
            <button type="button" className="btn secondary" onClick={() => void saveProfile()}>
              {t("onboarding.retry")}
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn secondary" onClick={goToBack} disabled={saveState === "saving"}>
            {t("onboarding.back")}
          </button>

          {step < LAST_STEP ? (
            <button type="button" className="btn" onClick={goToNext} disabled={!isStepValid || saveState === "saving"}>
              {t("onboarding.next")}
            </button>
          ) : (
            <button type="button" className="btn" onClick={() => void saveProfile()} disabled={!isStepValid || saveState === "saving"}>
              {saveState === "saving" ? t("onboarding.saving") : t("onboarding.finish")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
