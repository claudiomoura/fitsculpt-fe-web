"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import {
  defaultProfile,
  type Activity,
  type Goal,
  type GoalTag,
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
import { getUserProfile, updateUserProfilePreferences } from "@/lib/profileService";
import BodyFatSelector from "@/components/profile/BodyFatSelector";

type CheckinEntry = {
  date?: string;
};

export default function OnboardingClient() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [allergyInput, setAllergyInput] = useState("");
  const [latestCheckinDate, setLatestCheckinDate] = useState<string | null>(null);

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
    const loadTracking = async () => {
      try {
        const response = await fetch("/api/tracking", { cache: "no-store", credentials: "include" });
        if (!response.ok) return;
        const data = (await response.json()) as { checkins?: CheckinEntry[] };
        if (!active) return;
        if (data.checkins && data.checkins.length > 0) {
          const latest = [...data.checkins].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
          setLatestCheckinDate(latest?.date ?? null);
        }
      } catch {
        setLatestCheckinDate(null);
      }
    };
    void loadProfile();
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
    const next = searchParams.get("next");
    const ai = searchParams.get("ai");
    if (ai === "training") {
      router.push("/app/entrenamiento?ai=1");
      return;
    }
    if (ai === "nutrition") {
      router.push("/app/nutricion?ai=1");
      return;
    }
    if (next) {
      router.push(next);
      return;
    }
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
        </div>
      </section>

      <section className="card">
        <details className="accordion-card" open>
          <summary>{t("onboarding.sectionBasics")}</summary>
          <div className="form-stack" style={{ marginTop: 12 }}>
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
            <div className="form-stack">
              <span>{t("profile.bodyFat")}</span>
              <BodyFatSelector value={profile.measurements.bodyFatPercent} onChange={(value) => updateMeasurements("bodyFatPercent", value)} />
            </div>
          </div>
        </details>
      </section>

      <section className="card">
        <details className="accordion-card" open>
          <summary>{t("onboarding.sectionGoals")}</summary>
          <div className="form-stack" style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label className="form-stack">
                {t("profile.goal")}
                <select value={profile.goal} onChange={(e) => update("goal", e.target.value as Goal)}>
                  <option value="cut">{t("profile.goalCut")}</option>
                  <option value="maintain">{t("profile.goalMaintain")}</option>
                  <option value="bulk">{t("profile.goalBulk")}</option>
                </select>
              </label>
              <label className="form-stack">
                {t("profile.goalWeight")}
                <input type="number" min={35} max={250} value={profile.goalWeightKg} onChange={(e) => update("goalWeightKg", Number(e.target.value))} />
              </label>
            </div>
            <div className="form-stack">
              <span>{t("profile.goalTagsLabel")}</span>
              <div className="checkbox-grid">
                {goalOptions.map((goal) => (
                  <label key={goal.value} className="checkbox-card">
                    <input
                      type="checkbox"
                      checked={profile.goals.includes(goal.value)}
                      onChange={() => toggleGoal(goal.value)}
                    />
                    <span>{goal.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </details>
      </section>

      <section className="card">
        <details className="accordion-card" open>
          <summary>{t("onboarding.sectionTraining")}</summary>
          <div className="form-stack" style={{ marginTop: 12 }}>
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
                <select value={profile.trainingPreferences.daysPerWeek} onChange={(e) => updateTraining("daysPerWeek", Number(e.target.value) as ProfileData["trainingPreferences"]["daysPerWeek"])}>
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-stack">
                {t("profile.trainingSessionTime")}
                <select value={profile.trainingPreferences.sessionTime} onChange={(e) => updateTraining("sessionTime", e.target.value as SessionTime)}>
                  <option value="short">{t("profile.trainingSessionShort")}</option>
                  <option value="medium">{t("profile.trainingSessionMedium")}</option>
                  <option value="long">{t("profile.trainingSessionLong")}</option>
                </select>
              </label>
              <label className="form-stack">
                {t("profile.trainingFocus")}
                <select value={profile.trainingPreferences.focus} onChange={(e) => updateTraining("focus", e.target.value as TrainingFocus)}>
                  <option value="full">{t("profile.trainingFocusFull")}</option>
                  <option value="upperLower">{t("profile.trainingFocusUpperLower")}</option>
                  <option value="ppl">{t("profile.trainingFocusPpl")}</option>
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
                {t("profile.workoutLength")}
                <select value={profile.trainingPreferences.workoutLength} onChange={(e) => updateTraining("workoutLength", e.target.value as WorkoutLength)}>
                  <option value="30m">30 min</option>
                  <option value="45m">45 min</option>
                  <option value="60m">60 min</option>
                  <option value="flexible">{t("profile.workoutLengthFlexible")}</option>
                </select>
              </label>
              <label className="form-stack">
                {t("profile.timerSound")}
                <select value={profile.trainingPreferences.timerSound} onChange={(e) => updateTraining("timerSound", e.target.value as TimerSound)}>
                  <option value="ding">{t("profile.timerSoundDing")}</option>
                  <option value="repsToDo">{t("profile.timerSoundReps")}</option>
                </select>
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label className="checkbox-card">
                <input
                  type="checkbox"
                  checked={profile.trainingPreferences.includeCardio}
                  onChange={(e) => updateTraining("includeCardio", e.target.checked)}
                />
                <span>{t("profile.includeCardio")}</span>
              </label>
              <label className="checkbox-card">
                <input
                  type="checkbox"
                  checked={profile.trainingPreferences.includeMobilityWarmups}
                  onChange={(e) => updateTraining("includeMobilityWarmups", e.target.checked)}
                />
                <span>{t("profile.includeMobility")}</span>
              </label>
            </div>
          </div>
        </details>
      </section>

      <section className="card">
        <details className="accordion-card" open>
          <summary>{t("onboarding.sectionNutrition")}</summary>
          <div className="form-stack" style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label className="form-stack">
                {t("profile.mealsPerDay")}
                <select value={profile.nutritionPreferences.mealsPerDay} onChange={(e) => updateNutrition("mealsPerDay", Number(e.target.value) as ProfileData["nutritionPreferences"]["mealsPerDay"])}>
                  {[1, 2, 3, 4, 5, 6].map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-stack">
                {t("profile.dietTypeLabel")}
                <select value={profile.nutritionPreferences.dietType} onChange={(e) => updateNutrition("dietType", e.target.value as NutritionDietType)}>
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
                <select value={profile.nutritionPreferences.cookingTime} onChange={(e) => updateNutrition("cookingTime", e.target.value as NutritionCookingTime)}>
                  <option value="quick">{t("profile.cookingTimeOptionQuick")}</option>
                  <option value="medium">{t("profile.cookingTimeOptionMedium")}</option>
                  <option value="long">{t("profile.cookingTimeOptionLong")}</option>
                </select>
              </label>
            </div>

            <div className="form-stack">
              <span>{t("profile.mealDistributionLabel")}</span>
              <div className="badge-list">
                {mealDistributionOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`badge ${profile.nutritionPreferences.mealDistribution.preset === option.value ? "active" : ""}`}
                    onClick={() => updateMealDistributionPreset(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {profile.nutritionPreferences.mealDistribution.preset === "custom" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                  {(profile.nutritionPreferences.mealDistribution.percentages ?? [30, 35, 25, 10]).map((percent, index) => (
                    <label key={index} className="form-stack">
                      {t(
                        index === 0
                          ? "profile.mealDistributionBreakfast"
                          : index === 1
                            ? "profile.mealDistributionLunch"
                            : index === 2
                              ? "profile.mealDistributionDinner"
                              : "profile.mealDistributionSnack"
                      )}
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={percent}
                        onChange={(e) => updateMealDistributionPercentage(index, Number(e.target.value))}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </details>
      </section>

      <section className="card">
        <details className="accordion-card" open>
          <summary>{t("onboarding.sectionAllergies")}</summary>
          <div className="form-stack" style={{ marginTop: 12 }}>
            <div className="form-stack">
              <span>{t("profile.allergiesLabel")}</span>
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
              {profile.nutritionPreferences.allergies.length > 0 && (
                <div className="badge-list">
                  {profile.nutritionPreferences.allergies.map((allergy) => (
                    <span key={allergy} className="badge" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {allergy}
                      <button type="button" className="btn secondary" onClick={() => removeAllergy(allergy)}>
                        {t("profile.remove")}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <label className="form-stack">
              {t("profile.dietaryPrefs")}
              <textarea
                value={profile.nutritionPreferences.dietaryPrefs}
                onChange={(e) => updateNutrition("dietaryPrefs", e.target.value)}
                rows={2}
              />
            </label>
            <label className="form-stack">
              {t("profile.preferredFoods")}
              <textarea
                value={profile.nutritionPreferences.preferredFoods}
                onChange={(e) => updateNutrition("preferredFoods", e.target.value)}
                rows={2}
              />
            </label>
            <label className="form-stack">
              {t("profile.dislikedFoods")}
              <textarea
                value={profile.nutritionPreferences.dislikedFoods}
                onChange={(e) => updateNutrition("dislikedFoods", e.target.value)}
                rows={2}
              />
            </label>
          </div>
        </details>
      </section>

      <section className="card">
        <details className="accordion-card" open>
          <summary>{t("onboarding.sectionInjuries")}</summary>
          <div className="form-stack" style={{ marginTop: 12 }}>
            <label className="form-stack">
              {t("profile.injuries")}
              <textarea value={profile.injuries} onChange={(e) => update("injuries", e.target.value)} rows={3} />
            </label>
            <label className="form-stack">
              {t("profile.notes")}
              <textarea value={profile.notes} onChange={(e) => update("notes", e.target.value)} rows={3} />
            </label>
          </div>
        </details>
      </section>

      <section className="card">
        <details className="accordion-card" open>
          <summary>{t("onboarding.sectionMacros")}</summary>
          <div className="form-stack" style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label className="form-stack">
                {t("profile.macroFormula")}
                <select value={profile.macroPreferences.formula} onChange={(e) => updateMacros("formula", e.target.value as MacroFormula)}>
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
        </details>
      </section>

      <section className="card">
        <details className="accordion-card" open>
          <summary>{t("onboarding.sectionMetrics")}</summary>
          <div className="info-grid" style={{ marginTop: 12 }}>
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
              <div className="info-label">{t("profile.neck")}</div>
              <div className="info-value">{profile.measurements.neckCm} cm</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("profile.biceps")}</div>
              <div className="info-value">{profile.measurements.bicepsCm} cm</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("profile.thigh")}</div>
              <div className="info-value">{profile.measurements.thighCm} cm</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("profile.calf")}</div>
              <div className="info-value">{profile.measurements.calfCm} cm</div>
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
        </details>
      </section>

      <section className="card">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn" disabled={saving} onClick={saveProfile}>
            {saving ? t("onboarding.saving") : t("onboarding.finish")}
          </button>
          {message && <span className="muted">{message}</span>}
        </div>
      </section>
    </div>
  );
}
