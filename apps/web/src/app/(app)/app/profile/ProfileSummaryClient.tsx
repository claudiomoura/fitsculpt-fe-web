"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { defaultProfile, type ProfileData } from "@/lib/profile";
import { getUserProfile } from "@/lib/profileService";

type CheckinEntry = {
  date?: string;
};

export default function ProfileSummaryClient() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [latestCheckinDate, setLatestCheckinDate] = useState<string | null>(null);

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

  const formatValue = (value: string | number | null | undefined, suffix?: string) => {
    if (value === null || value === undefined) return t("profile.noData");
    if (typeof value === "string" && value.trim().length === 0) return t("profile.noData");
    return suffix ? `${value} ${suffix}` : String(value);
  };

  const goalsLabel = profile.goals.length
    ? profile.goals
        .map((goal) => t(`profile.goalTag${goal === "buildStrength" ? "Strength" : goal === "loseFat" ? "LoseFat" : goal === "betterHealth" ? "Health" : goal === "moreEnergy" ? "Energy" : "Toned"}`))
        .join(", ")
    : t("profile.noData");

  return (
    <div className="page">
      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>{t("profile.summaryTitle")}</h2>
            <p className="section-subtitle">{t("profile.summarySubtitle")}</p>
          </div>
          <Link className="btn" href="/app/onboarding">
            {t("profile.editProfile")}
          </Link>
        </div>
      </section>

      <section className="card">
        <h3 className="section-title" style={{ fontSize: 18 }}>{t("profile.summaryBasics")}</h3>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">{t("profile.name")}</div>
            <div className="info-value">{formatValue(profile.name)}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.sex")}</div>
            <div className="info-value">{t(profile.sex === "female" ? "profile.sexFemale" : "profile.sexMale")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.age")}</div>
            <div className="info-value">{formatValue(profile.age)}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.height")}</div>
            <div className="info-value">{formatValue(profile.heightCm, "cm")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.weight")}</div>
            <div className="info-value">{formatValue(profile.weightKg, "kg")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.activity")}</div>
            <div className="info-value">
              {t(
                profile.activity === "sedentary"
                  ? "profile.activitySedentary"
                  : profile.activity === "light"
                    ? "profile.activityLight"
                    : profile.activity === "very"
                      ? "profile.activityVery"
                      : profile.activity === "extra"
                        ? "profile.activityExtra"
                        : "profile.activityModerate"
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="section-title" style={{ fontSize: 18 }}>{t("profile.summaryGoals")}</h3>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">{t("profile.goal")}</div>
            <div className="info-value">
              {t(profile.goal === "cut" ? "profile.goalCut" : profile.goal === "bulk" ? "profile.goalBulk" : "profile.goalMaintain")}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.goalWeight")}</div>
            <div className="info-value">{formatValue(profile.goalWeightKg, "kg")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.goalTagsLabel")}</div>
            <div className="info-value">{goalsLabel}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="section-title" style={{ fontSize: 18 }}>{t("profile.summaryTraining")}</h3>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">{t("profile.trainingLevel")}</div>
            <div className="info-value">
              {t(
                profile.trainingPreferences.level === "beginner"
                  ? "profile.trainingLevelBeginner"
                  : profile.trainingPreferences.level === "intermediate"
                    ? "profile.trainingLevelIntermediate"
                    : "profile.trainingLevelAdvanced"
              )}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.trainingDays")}</div>
            <div className="info-value">{formatValue(profile.trainingPreferences.daysPerWeek)}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.trainingSessionTime")}</div>
            <div className="info-value">
              {t(
                profile.trainingPreferences.sessionTime === "short"
                  ? "profile.trainingSessionShort"
                  : profile.trainingPreferences.sessionTime === "long"
                    ? "profile.trainingSessionLong"
                    : "profile.trainingSessionMedium"
              )}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.trainingFocus")}</div>
            <div className="info-value">
              {t(
                profile.trainingPreferences.focus === "ppl"
                  ? "profile.trainingFocusPpl"
                  : profile.trainingPreferences.focus === "upperLower"
                    ? "profile.trainingFocusUpperLower"
                    : "profile.trainingFocusFull"
              )}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.trainingEquipment")}</div>
            <div className="info-value">
              {t(profile.trainingPreferences.equipment === "home" ? "profile.trainingEquipmentHome" : "profile.trainingEquipmentGym")}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.includeCardio")}</div>
            <div className="info-value">{profile.trainingPreferences.includeCardio ? t("profile.yes") : t("profile.no")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.includeMobility")}</div>
            <div className="info-value">{profile.trainingPreferences.includeMobilityWarmups ? t("profile.yes") : t("profile.no")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.workoutLength")}</div>
            <div className="info-value">
              {profile.trainingPreferences.workoutLength === "30m"
                ? "30 min"
                : profile.trainingPreferences.workoutLength === "60m"
                  ? "60 min"
                  : profile.trainingPreferences.workoutLength === "flexible"
                    ? t("profile.workoutLengthFlexible")
                    : "45 min"}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.timerSound")}</div>
            <div className="info-value">
              {t(profile.trainingPreferences.timerSound === "repsToDo" ? "profile.timerSoundReps" : "profile.timerSoundDing")}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="section-title" style={{ fontSize: 18 }}>{t("profile.summaryNutrition")}</h3>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">{t("profile.mealsPerDay")}</div>
            <div className="info-value">{formatValue(profile.nutritionPreferences.mealsPerDay)}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.dietTypeLabel")}</div>
            <div className="info-value">{t(`profile.dietType.${profile.nutritionPreferences.dietType}`)}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.cookingTime")}</div>
            <div className="info-value">
              {t(
                profile.nutritionPreferences.cookingTime === "quick"
                  ? "profile.cookingTimeOptionQuick"
                  : profile.nutritionPreferences.cookingTime === "long"
                    ? "profile.cookingTimeOptionLong"
                    : "profile.cookingTimeOptionMedium"
              )}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.mealDistributionLabel")}</div>
            <div className="info-value">
              {profile.nutritionPreferences.mealDistribution.preset === "custom"
                ? t("profile.mealDistributionCustom")
                : t(`profile.mealDistribution.${profile.nutritionPreferences.mealDistribution.preset}`)}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="section-title" style={{ fontSize: 18 }}>{t("profile.summaryAllergies")}</h3>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">{t("profile.allergiesLabel")}</div>
            <div className="info-value">
              {profile.nutritionPreferences.allergies.length ? profile.nutritionPreferences.allergies.join(", ") : t("profile.noData")}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.dietaryPrefs")}</div>
            <div className="info-value">{formatValue(profile.nutritionPreferences.dietaryPrefs)}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.preferredFoods")}</div>
            <div className="info-value">{formatValue(profile.nutritionPreferences.preferredFoods)}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.dislikedFoods")}</div>
            <div className="info-value">{formatValue(profile.nutritionPreferences.dislikedFoods)}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="section-title" style={{ fontSize: 18 }}>{t("profile.summaryInjuries")}</h3>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">{t("profile.injuries")}</div>
            <div className="info-value">{formatValue(profile.injuries)}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.notes")}</div>
            <div className="info-value">{formatValue(profile.notes)}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="section-title" style={{ fontSize: 18 }}>{t("profile.summaryMacros")}</h3>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">{t("profile.macroFormula")}</div>
            <div className="info-value">{t(profile.macroPreferences.formula === "katch" ? "profile.macroFormulaKatch" : "profile.macroFormulaMifflin")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.macroProtein")}</div>
            <div className="info-value">{formatValue(profile.macroPreferences.proteinGPerKg, "g/kg")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.macroFat")}</div>
            <div className="info-value">{formatValue(profile.macroPreferences.fatGPerKg, "g/kg")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.macroCutPercent")}</div>
            <div className="info-value">{formatValue(profile.macroPreferences.cutPercent, "%")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.macroBulkPercent")}</div>
            <div className="info-value">{formatValue(profile.macroPreferences.bulkPercent, "%")}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="section-title" style={{ fontSize: 18 }}>{t("profile.latestMetricsTitle")}</h3>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">{t("profile.weight")}</div>
            <div className="info-value">{formatValue(profile.weightKg, "kg")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.waist")}</div>
            <div className="info-value">{formatValue(profile.measurements.waistCm, "cm")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.chest")}</div>
            <div className="info-value">{formatValue(profile.measurements.chestCm, "cm")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.hips")}</div>
            <div className="info-value">{formatValue(profile.measurements.hipsCm, "cm")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.neck")}</div>
            <div className="info-value">{formatValue(profile.measurements.neckCm, "cm")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.biceps")}</div>
            <div className="info-value">{formatValue(profile.measurements.bicepsCm, "cm")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.thigh")}</div>
            <div className="info-value">{formatValue(profile.measurements.thighCm, "cm")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.calf")}</div>
            <div className="info-value">{formatValue(profile.measurements.calfCm, "cm")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.bodyFat")}</div>
            <div className="info-value">{formatValue(profile.measurements.bodyFatPercent, "%")}</div>
          </div>
          {latestCheckinDate && (
            <div className="info-item">
              <div className="info-label">{t("profile.checkinDate")}</div>
              <div className="info-value">{latestCheckinDate}</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
