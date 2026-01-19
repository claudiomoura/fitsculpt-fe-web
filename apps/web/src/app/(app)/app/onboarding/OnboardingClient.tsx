"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import {
  defaultProfile,
  type Activity,
  type Goal,
  type GoalTag,
  type MealDistributionPreset,
  type NutritionDietType,
  type ProfileData,
  type Sex,
  type TrainingEquipment,
  type TrainingLevel,
} from "@/lib/profile";
import { getUserProfile, updateUserProfilePreferences } from "@/lib/profileService";

const TOTAL_STEPS = 3;

export default function OnboardingClient() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [allergyInput, setAllergyInput] = useState("");

  const goalOptions: Array<{ value: GoalTag; label: string }> = [
    { value: "buildStrength", label: t("profile.goalTagStrength") },
    { value: "loseFat", label: t("profile.goalTagLoseFat") },
    { value: "betterHealth", label: t("profile.goalTagHealth") },
    { value: "moreEnergy", label: t("profile.goalTagEnergy") },
    { value: "tonedMuscles", label: t("profile.goalTagToned") },
  ];

  const mealDistributionOptions: Array<{ value: MealDistributionPreset; label: string }> = [
    { value: "balanced", label: t("profile.mealDistributionBalanced") },
    { value: "lightDinner", label: t("profile.mealDistributionLightDinner") },
    { value: "bigBreakfast", label: t("profile.mealDistributionBigBreakfast") },
    { value: "bigLunch", label: t("profile.mealDistributionBigLunch") },
    { value: "custom", label: t("profile.mealDistributionCustom") },
  ];

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const data = await getUserProfile();
        if (active) setProfile(data);
      } catch {
        // ignore
      }
    };
    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function updateTraining<K extends keyof ProfileData["trainingPreferences"]>(
    key: K,
    value: ProfileData["trainingPreferences"][K]
  ) {
    setProfile((prev) => ({
      ...prev,
      trainingPreferences: {
        ...prev.trainingPreferences,
        [key]: value,
      },
    }));
  }

  function updateNutrition<K extends keyof ProfileData["nutritionPreferences"]>(
    key: K,
    value: ProfileData["nutritionPreferences"][K]
  ) {
    setProfile((prev) => ({
      ...prev,
      nutritionPreferences: {
        ...prev.nutritionPreferences,
        [key]: value,
      },
    }));
  }

  function toggleGoal(goal: GoalTag) {
    setProfile((prev) => {
      const exists = prev.goals.includes(goal);
      return { ...prev, goals: exists ? prev.goals.filter((item) => item !== goal) : [...prev.goals, goal] };
    });
  }

  function addAllergy() {
    const value = allergyInput.trim();
    if (!value) return;
    setProfile((prev) => ({
      ...prev,
      nutritionPreferences: {
        ...prev.nutritionPreferences,
        allergies: Array.from(new Set([...prev.nutritionPreferences.allergies, value])),
      },
    }));
    setAllergyInput("");
  }

  function removeAllergy(value: string) {
    setProfile((prev) => ({
      ...prev,
      nutritionPreferences: {
        ...prev.nutritionPreferences,
        allergies: prev.nutritionPreferences.allergies.filter((item) => item !== value),
      },
    }));
  }

  function updateMealDistributionPreset(preset: MealDistributionPreset) {
    setProfile((prev) => ({
      ...prev,
      nutritionPreferences: {
        ...prev.nutritionPreferences,
        mealDistribution: {
          preset,
          percentages:
            preset === "custom"
              ? prev.nutritionPreferences.mealDistribution.percentages ?? [30, 35, 25, 10]
              : undefined,
        },
      },
    }));
  }

  function updateMealDistributionPercentage(index: number, value: number) {
    setProfile((prev) => {
      const current = prev.nutritionPreferences.mealDistribution.percentages ?? [30, 35, 25, 10];
      const next = [...current];
      next[index] = value;
      return {
        ...prev,
        nutritionPreferences: {
          ...prev.nutritionPreferences,
          mealDistribution: {
            preset: "custom",
            percentages: next,
          },
        },
      };
    });
  }

  async function saveProfile() {
    setSaving(true);
    setMessage(null);
    const updated = await updateUserProfilePreferences(profile);
    setProfile(updated);
    setSaving(false);
    setMessage(t("onboarding.saved"));
    window.setTimeout(() => setMessage(null), 2000);
  }

  return (
    <div className="page">
      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>{t("onboarding.title")}</h2>
            <p className="section-subtitle">{t("onboarding.subtitle")}</p>
          </div>
          <span className="badge">{t("onboarding.stepLabel")} {step}/{TOTAL_STEPS}</span>
        </div>

        {step === 1 && (
          <div className="form-stack">
            <label className="form-stack">
              {t("profile.name")}
              <input value={profile.name} onChange={(e) => update("name", e.target.value)} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label className="form-stack">
                {t("profile.sex")}
                <select value={profile.sex} onChange={(e) => update("sex", e.target.value as Sex)}>
                  <option value="male">{t("profile.sexMale")}</option>
                  <option value="female">{t("profile.sexFemale")}</option>
                </select>
              </label>
              <label className="form-stack">
                {t("profile.age")}
                <input type="number" min={10} max={100} value={profile.age} onChange={(e) => update("age", Number(e.target.value))} />
              </label>
              <label className="form-stack">
                {t("profile.height")}
                <input type="number" min={120} max={230} value={profile.heightCm} onChange={(e) => update("heightCm", Number(e.target.value))} />
              </label>
              <label className="form-stack">
                {t("profile.weight")}
                <input type="number" min={35} max={250} value={profile.weightKg} onChange={(e) => update("weightKg", Number(e.target.value))} />
              </label>
              <label className="form-stack">
                {t("profile.activity")}
                <select value={profile.activity} onChange={(e) => update("activity", e.target.value as Activity)}>
                  <option value="sedentary">{t("profile.activitySedentary")}</option>
                  <option value="light">{t("profile.activityLight")}</option>
                  <option value="moderate">{t("profile.activityModerate")}</option>
                  <option value="very">{t("profile.activityVery")}</option>
                  <option value="extra">{t("profile.activityExtra")}</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form-stack">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label className="form-stack">
                {t("profile.goalWeight")}
                <input type="number" min={35} max={250} value={profile.goalWeightKg} onChange={(e) => update("goalWeightKg", Number(e.target.value))} />
              </label>
              <label className="form-stack">
                {t("profile.goal")}
                <select value={profile.goal} onChange={(e) => update("goal", e.target.value as Goal)}>
                  <option value="cut">{t("profile.goalCut")}</option>
                  <option value="maintain">{t("profile.goalMaintain")}</option>
                  <option value="bulk">{t("profile.goalBulk")}</option>
                </select>
              </label>
            </div>
            <div className="form-stack">
              <div style={{ fontWeight: 600 }}>{t("profile.goalTagsLabel")}</div>
              <div style={{ display: "grid", gap: 8 }}>
                {goalOptions.map((option) => (
                  <label key={option.value} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={profile.goals.includes(option.value)} onChange={() => toggleGoal(option.value)} />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-stack">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label className="form-stack">
                {t("profile.trainingLevel")}
                <select value={profile.trainingPreferences.level} onChange={(e) => updateTraining("level", e.target.value as TrainingLevel)}>
                  <option value="beginner">{t("profile.trainingLevelBeginner")}</option>
                  <option value="intermediate">{t("profile.trainingLevelIntermediate")}</option>
                  <option value="advanced">{t("profile.trainingLevelAdvanced")}</option>
                </select>
              </label>
              <label className="form-stack">
                {t("profile.trainingDays")}
                <select
                  value={profile.trainingPreferences.daysPerWeek}
                  onChange={(e) => updateTraining("daysPerWeek", Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 | 7)}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                  <option value={6}>6</option>
                  <option value={7}>7</option>
                </select>
              </label>
              <label className="form-stack">
                {t("profile.trainingEquipment")}
                <select value={profile.trainingPreferences.equipment} onChange={(e) => updateTraining("equipment", e.target.value as TrainingEquipment)}>
                  <option value="gym">{t("profile.trainingEquipmentGym")}</option>
                  <option value="home">{t("profile.trainingEquipmentHome")}</option>
                </select>
              </label>
              <label className="form-stack">
                {t("profile.mealsPerDay")}
                <select
                  value={profile.nutritionPreferences.mealsPerDay}
                  onChange={(e) => updateNutrition("mealsPerDay", Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6)}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                  <option value={6}>6</option>
                </select>
              </label>
              <label className="form-stack">
                {t("profile.dietTypeLabel")}
                <select
                  value={profile.nutritionPreferences.dietType}
                  onChange={(e) => updateNutrition("dietType", e.target.value as NutritionDietType)}
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
              </label>
              <label className="form-stack">
                {t("profile.mealDistributionLabel")}
                <select
                  value={profile.nutritionPreferences.mealDistribution.preset}
                  onChange={(e) => updateMealDistributionPreset(e.target.value as MealDistributionPreset)}
                >
                  {mealDistributionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {profile.nutritionPreferences.mealDistribution.preset === "custom" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                {[t("profile.mealDistributionBreakfast"), t("profile.mealDistributionLunch"), t("profile.mealDistributionDinner"), t("profile.mealDistributionSnack")].map(
                  (label, index) => (
                    <label key={label} className="form-stack">
                      {label}
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={profile.nutritionPreferences.mealDistribution.percentages?.[index] ?? 0}
                        onChange={(e) => updateMealDistributionPercentage(index, Number(e.target.value))}
                      />
                    </label>
                  )
                )}
              </div>
            )}

            <label className="form-stack">
              {t("profile.injuriesLabel")}
              <textarea value={profile.injuries} onChange={(e) => update("injuries", e.target.value)} rows={3} />
            </label>

            <div className="form-stack">
              <div style={{ fontWeight: 600 }}>{t("profile.allergiesLabel")}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {profile.nutritionPreferences.allergies.length === 0 ? (
                  <span className="muted">{t("profile.allergiesEmpty")}</span>
                ) : (
                  profile.nutritionPreferences.allergies.map((allergy) => (
                    <span key={allergy} className="badge">
                      {allergy}
                      <button
                        type="button"
                        className="btn secondary"
                        style={{ marginLeft: 6, padding: "2px 6px" }}
                        onClick={() => removeAllergy(allergy)}
                      >
                        {t("profile.remove")}
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  placeholder={t("profile.allergiesPlaceholder")}
                />
                <button type="button" className="btn secondary" onClick={addAllergy}>
                  {t("profile.addAllergy")}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          <button type="button" className="btn secondary" disabled={step === 1} onClick={() => setStep((prev) => Math.max(1, prev - 1))}>
            {t("onboarding.back")}
          </button>
          {step < TOTAL_STEPS ? (
            <button type="button" className="btn" onClick={() => setStep((prev) => Math.min(TOTAL_STEPS, prev + 1))}>
              {t("onboarding.next")}
            </button>
          ) : (
            <button type="button" className="btn" disabled={saving} onClick={saveProfile}>
              {saving ? t("onboarding.saving") : t("onboarding.finish")}
            </button>
          )}
          {message && <span className="muted">{message}</span>}
        </div>
      </section>
    </div>
  );
}
