"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import {
  defaultProfile,
  type Activity,
  type Goal,
  type NutritionDietType,
  type MacroFormula,
  type ProfileData,
  type Sex,
  type TrainingEquipment,
  type TrainingFocus,
  type TrainingLevel,
  type SessionTime,
  type GoalTag,
  type MealDistributionPreset,
  type NutritionCookingTime,
  type TimerSound,
  type WorkoutLength,
} from "@/lib/profile";
import { getUserProfile, updateUserProfilePreferences } from "@/lib/profileService";
import BodyFatSelector from "@/components/profile/BodyFatSelector";

export default function ProfileClient() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [saved, setSaved] = useState(false);
  const [latestCheckinDate, setLatestCheckinDate] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
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
        if (active) {
          setProfile(data);
        }
      } catch {
        // Ignore fetch errors on first load.
      }
    };
    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadTracking = async () => {
      try {
        const response = await fetch("/api/tracking", { cache: "no-store", credentials: "include" });
        if (!response.ok) return;
        const data = (await response.json()) as { checkins?: Array<{ date?: string }> };
        if (!active) return;
        if (data.checkins && data.checkins.length > 0) {
          const latest = [...data.checkins].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
          setLatestCheckinDate(latest?.date ?? null);
        }
      } catch {
        setLatestCheckinDate(null);
      }
    };
    void loadTracking();
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

  function updateMacros<K extends keyof ProfileData["macroPreferences"]>(
    key: K,
    value: ProfileData["macroPreferences"][K]
  ) {
    setProfile((prev) => ({
      ...prev,
      macroPreferences: {
        ...prev.macroPreferences,
        [key]: value,
      },
    }));
  }

  function updateMeasurements<K extends keyof ProfileData["measurements"]>(
    key: K,
    value: ProfileData["measurements"][K]
  ) {
    setProfile((prev) => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [key]: value,
      },
    }));
  }

  function toggleGoal(goal: GoalTag) {
    setProfile((prev) => {
      const exists = prev.goals.includes(goal);
      const goals = exists ? prev.goals.filter((item) => item !== goal) : [...prev.goals, goal];
      return { ...prev, goals };
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
    const nextProfile = await updateUserProfilePreferences(profile);
    setProfile(nextProfile);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  async function resetProfile() {
    const nextProfile = await updateUserProfilePreferences(defaultProfile);
    setProfile(nextProfile);
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextUrl = String(reader.result || "");
      setProfile((prev) => ({ ...prev, profilePhotoUrl: nextUrl, avatarDataUrl: nextUrl }));
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setProfile((prev) => ({ ...prev, profilePhotoUrl: null, avatarDataUrl: null }));
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordLoading(true);
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setPasswordLoading(false);
    if (!response.ok) {
      setPasswordMessage(t("profile.passwordError"));
      return;
    }
    setPasswordMessage(t("profile.passwordSuccess"));
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <div className="page">
      <section className="card">
        <div className="section-head">
          <div>
        <h2 className="section-title" style={{ fontSize: 20 }}>
              {t("profile.formTitle")}
            </h2>
            <p className="section-subtitle">{t("app.profileSubtitle")}</p>
          </div>
          <Link href="/app/onboarding" className="btn secondary">
            {t("profile.openOnboarding")}
          </Link>
        </div>

        <div className="form-stack">
          <div>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{t("profile.basicsTitle")}</h3>
            <div className="form-stack">
              <div className="form-stack">
                <div style={{ fontWeight: 600 }}>{t("profile.avatarTitle")}</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  {profile.profilePhotoUrl ? (
                    <img
                      src={profile.profilePhotoUrl}
                      alt={t("profile.avatarTitle")}
                      style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: "var(--primary-soft)",
                        display: "grid",
                        placeItems: "center",
                        color: "#9a3412",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {t("profile.avatarTitle")}
                    </div>
                  )}
                  <div className="form-stack" style={{ minWidth: 200 }}>
                    <label className="form-stack">
                      {t("profile.avatarUpload")}
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} />
                    </label>
                    {profile.profilePhotoUrl && (
                      <button type="button" className="btn secondary" onClick={removeAvatar}>
                        {t("profile.avatarRemove")}
                      </button>
                    )}
                    <span className="muted">{t("profile.avatarHint")}</span>
                  </div>
                </div>
              </div>

              <label className="form-stack">
                {t("profile.name")}
                <input
                  value={profile.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder={t("profile.namePlaceholder")}
                />
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
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={profile.age}
                    onChange={(e) => update("age", Number(e.target.value))}
                  />
                </label>

                <label className="form-stack">
                  {t("profile.height")}
                  <input
                    type="number"
                    min={120}
                    max={230}
                    value={profile.heightCm}
                    onChange={(e) => update("heightCm", Number(e.target.value))}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <label className="form-stack">
                  {t("profile.weight")}
                  <input
                    type="number"
                    min={35}
                    max={250}
                    value={profile.weightKg}
                    onChange={(e) => update("weightKg", Number(e.target.value))}
                  />
                </label>

                <label className="form-stack">
                  {t("profile.activity")}
                  <select
                    value={profile.activity}
                    onChange={(e) => update("activity", e.target.value as Activity)}
                  >
                    <option value="sedentary">{t("profile.activitySedentary")}</option>
                    <option value="light">{t("profile.activityLight")}</option>
                    <option value="moderate">{t("profile.activityModerate")}</option>
                    <option value="very">{t("profile.activityVery")}</option>
                    <option value="extra">{t("profile.activityExtra")}</option>
                  </select>
                </label>
              </div>

              <div className="form-stack" style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600 }}>{t("profile.bodyFat")}</div>
                <BodyFatSelector
                  value={profile.measurements.bodyFatPercent || null}
                  onChange={(value) => updateMeasurements("bodyFatPercent", value)}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{t("profile.goalsTitle")}</h3>
            <div className="form-stack">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <label className="form-stack">
                  {t("profile.goalWeight")}
                  <input
                    type="number"
                    min={35}
                    max={250}
                    value={profile.goalWeightKg}
                    onChange={(e) => update("goalWeightKg", Number(e.target.value))}
                  />
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
                      <input
                        type="checkbox"
                        checked={profile.goals.includes(option.value)}
                        onChange={() => toggleGoal(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
                <span className="muted">{t("profile.goalTagsHint")}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{t("profile.trainingPrefsTitle")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label className="form-stack">
                {t("profile.trainingLevel")}
                <select
                  value={profile.trainingPreferences.level}
                  onChange={(e) => updateTraining("level", e.target.value as TrainingLevel)}
                >
                  <option value="beginner">{t("profile.trainingLevelBeginner")}</option>
                  <option value="intermediate">{t("profile.trainingLevelIntermediate")}</option>
                  <option value="advanced">{t("profile.trainingLevelAdvanced")}</option>
                </select>
              </label>

              <label className="form-stack">
                {t("profile.trainingDays")}
                <select
                  value={profile.trainingPreferences.daysPerWeek}
                  onChange={(e) =>
                    updateTraining("daysPerWeek", Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 | 7)
                  }
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
                {t("profile.trainingSessionTime")}
                <select
                  value={profile.trainingPreferences.sessionTime}
                  onChange={(e) => updateTraining("sessionTime", e.target.value as SessionTime)}
                >
                  <option value="short">{t("profile.trainingSessionShort")}</option>
                  <option value="medium">{t("profile.trainingSessionMedium")}</option>
                  <option value="long">{t("profile.trainingSessionLong")}</option>
                </select>
              </label>

              <label className="form-stack">
                {t("profile.trainingFocus")}
                <select
                  value={profile.trainingPreferences.focus}
                  onChange={(e) => updateTraining("focus", e.target.value as TrainingFocus)}
                >
                  <option value="full">{t("profile.trainingFocusFull")}</option>
                  <option value="upperLower">{t("profile.trainingFocusUpperLower")}</option>
                  <option value="ppl">{t("profile.trainingFocusPpl")}</option>
                </select>
              </label>

              <label className="form-stack">
                {t("profile.trainingEquipment")}
                <select
                  value={profile.trainingPreferences.equipment}
                  onChange={(e) => updateTraining("equipment", e.target.value as TrainingEquipment)}
                >
                  <option value="gym">{t("profile.trainingEquipmentGym")}</option>
                  <option value="home">{t("profile.trainingEquipmentHome")}</option>
                </select>
              </label>

              <label className="form-stack">
                {t("profile.workoutLength")}
                <select
                  value={profile.trainingPreferences.workoutLength}
                  onChange={(e) => updateTraining("workoutLength", e.target.value as WorkoutLength)}
                >
                  <option value="30m">30 min</option>
                  <option value="45m">45 min</option>
                  <option value="60m">60 min</option>
                  <option value="flexible">{t("profile.workoutLengthFlexible")}</option>
                </select>
              </label>

              <label className="form-stack">
                {t("profile.timerSound")}
                <select
                  value={profile.trainingPreferences.timerSound}
                  onChange={(e) => updateTraining("timerSound", e.target.value as TimerSound)}
                >
                  <option value="ding">{t("profile.timerSoundDing")}</option>
                  <option value="repsToDo">{t("profile.timerSoundReps")}</option>
                </select>
              </label>
            </div>

            <div className="form-stack" style={{ marginTop: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={profile.trainingPreferences.includeCardio}
                  onChange={(e) => updateTraining("includeCardio", e.target.checked)}
                />
                <span>{t("profile.includeCardio")}</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={profile.trainingPreferences.includeMobilityWarmups}
                  onChange={(e) => updateTraining("includeMobilityWarmups", e.target.checked)}
                />
                <span>{t("profile.includeMobility")}</span>
              </label>
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{t("profile.nutritionPrefsTitle")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label className="form-stack">
                {t("profile.mealsPerDay")}
                <select
                  value={profile.nutritionPreferences.mealsPerDay}
                  onChange={(e) =>
                    updateNutrition("mealsPerDay", Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6)
                  }
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
                {t("profile.cookingTime")}
                <select
                  value={profile.nutritionPreferences.cookingTime}
                  onChange={(e) => updateNutrition("cookingTime", e.target.value as NutritionCookingTime)}
                >
                  <option value="quick">{t("profile.cookingTimeOptionQuick")}</option>
                  <option value="medium">{t("profile.cookingTimeOptionMedium")}</option>
                  <option value="long">{t("profile.cookingTimeOptionLong")}</option>
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                {[
                  t("profile.mealDistributionBreakfast"),
                  t("profile.mealDistributionLunch"),
                  t("profile.mealDistributionDinner"),
                  t("profile.mealDistributionSnack"),
                ].map((label, index) => (
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
                ))}
              </div>
            )}

            <div className="form-stack" style={{ marginTop: 12 }}>
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
                <span className="muted">{t("profile.allergiesHint")}</span>
              </div>

              <label className="form-stack">
                {t("profile.dietaryPrefs")}
                <input
                  value={profile.nutritionPreferences.dietaryPrefs}
                  onChange={(e) => updateNutrition("dietaryPrefs", e.target.value)}
                  placeholder={t("profile.dietaryPrefsPlaceholder")}
                />
              </label>

              <label className="form-stack">
                {t("profile.preferredFoods")}
                <input
                  value={profile.nutritionPreferences.preferredFoods}
                  onChange={(e) => updateNutrition("preferredFoods", e.target.value)}
                  placeholder={t("profile.preferredFoodsPlaceholder")}
                />
              </label>

              <label className="form-stack">
                {t("profile.dislikedFoods")}
                <input
                  value={profile.nutritionPreferences.dislikedFoods}
                  onChange={(e) => updateNutrition("dislikedFoods", e.target.value)}
                  placeholder={t("profile.dislikedFoodsPlaceholder")}
                />
              </label>
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{t("profile.injuriesTitle")}</h3>
            <label className="form-stack">
              {t("profile.injuriesLabel")}
              <textarea
                value={profile.injuries}
                onChange={(e) => update("injuries", e.target.value)}
                placeholder={t("profile.injuriesPlaceholder")}
                rows={3}
              />
            </label>
            <span className="muted">{t("profile.injuriesHint")}</span>
          </div>

          <div>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{t("profile.macroPrefsTitle")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label className="form-stack">
                {t("profile.macroFormula")}
                <select
                  value={profile.macroPreferences.formula}
                  onChange={(e) => updateMacros("formula", e.target.value as MacroFormula)}
                >
                  <option value="mifflin">{t("profile.macroFormulaMifflin")}</option>
                  <option value="katch">{t("profile.macroFormulaKatch")}</option>
                </select>
              </label>

              <label className="form-stack">
                {t("profile.macroProtein")}
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={profile.macroPreferences.proteinGPerKg}
                  onChange={(e) => updateMacros("proteinGPerKg", Number(e.target.value))}
                />
              </label>

              <label className="form-stack">
                {t("profile.macroFat")}
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={profile.macroPreferences.fatGPerKg}
                  onChange={(e) => updateMacros("fatGPerKg", Number(e.target.value))}
                />
              </label>

              <label className="form-stack">
                {t("profile.macroCutPercent")}
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={profile.macroPreferences.cutPercent}
                  onChange={(e) => updateMacros("cutPercent", Number(e.target.value))}
                />
              </label>

              <label className="form-stack">
                {t("profile.macroBulkPercent")}
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={profile.macroPreferences.bulkPercent}
                  onChange={(e) => updateMacros("bulkPercent", Number(e.target.value))}
                />
              </label>
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{t("profile.latestMetricsTitle")}</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              {t("profile.latestMetricsHint")}
            </p>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">{t("profile.weight")}</div>
                <div className="info-value">{profile.weightKg} kg</div>
              </div>
              <div className="info-item">
                <div className="info-label">{t("profile.waist")}</div>
                <div className="info-value">{profile.measurements.waistCm} cm</div>
              </div>
              <div className="info-item">
                <div className="info-label">{t("profile.chest")}</div>
                <div className="info-value">{profile.measurements.chestCm} cm</div>
              </div>
              <div className="info-item">
                <div className="info-label">{t("profile.hips")}</div>
                <div className="info-value">{profile.measurements.hipsCm} cm</div>
              </div>
              <div className="info-item">
                <div className="info-label">{t("profile.bodyFat")}</div>
                <div className="info-value">{profile.measurements.bodyFatPercent}%</div>
              </div>
              {latestCheckinDate && (
                <div className="info-item">
                  <div className="info-label">{t("profile.checkinDate")}</div>
                  <div className="info-value">{latestCheckinDate}</div>
                </div>
              )}
            </div>
          </div>

          <label className="form-stack">
            {t("profile.notes")}
            <textarea
              value={profile.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder={t("profile.notesPlaceholder")}
              rows={3}
            />
          </label>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={saveProfile}>
              {t("profile.save")}
            </button>
            <button type="button" className="btn secondary" onClick={resetProfile}>
              {t("profile.reset")}
            </button>
            {saved && <span className="muted">{t("profile.savedToast")}</span>}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>
              {t("profile.passwordTitle")}
            </h2>
            <p className="section-subtitle">{t("profile.passwordSubtitle")}</p>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleChangePassword}>
          <label className="form-stack">
            {t("profile.currentPassword")}
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label className="form-stack">
            {t("profile.newPassword")}
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <button type="submit" className="btn" disabled={passwordLoading}>
            {passwordLoading ? t("profile.passwordSaving") : t("profile.passwordUpdate")}
          </button>
          {passwordMessage && <p className="muted">{passwordMessage}</p>}
        </form>
      </section>
    </div>
  );
}
