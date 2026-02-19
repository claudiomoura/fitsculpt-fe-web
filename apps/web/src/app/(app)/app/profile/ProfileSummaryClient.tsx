"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { defaultProfile, type ProfileData } from "@/lib/profile";
import { getUserProfile, mergeProfileData } from "@/lib/profileService";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";

type CheckinEntry = {
  date?: string;
};

export default function ProfileSummaryClient() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [latestCheckinDate, setLatestCheckinDate] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const data = await getUserProfile();
        if (active) setProfile(data);
      } catch (_err) {
        if (active) setError(t("profile.loadError"));
      } finally {
        if (active) setLoading(false);
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
      } catch (_err) {
        setLatestCheckinDate(null);
      }
    };

    void loadProfile();
    void loadTracking();
    return () => {
      active = false;
    };
  }, []);

  const avatarUrl = profile.profilePhotoUrl ?? profile.avatarDataUrl ?? null;

  const resizeImage = (file: File, maxSize = 256) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const width = Math.round(img.width * scale);
          const height = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("canvas"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
          resolve(canvas.toDataURL(outputType, 0.9));
        };
        img.onerror = () => reject(new Error("image"));
        img.src = String(reader.result || "");
      };
      reader.onerror = () => reject(new Error("read"));
      reader.readAsDataURL(file);
    });

  const saveAvatar = async (nextUrl: string | null) => {
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profilePhotoUrl: nextUrl, avatarDataUrl: nextUrl }),
    });
    if (!response.ok) throw new Error("avatar");
    const data = (await response.json()) as Partial<ProfileData> | null;
    const merged = mergeProfileData(data ?? { ...profile, profilePhotoUrl: nextUrl, avatarDataUrl: nextUrl });
    setProfile(merged);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarSaving(true);
    setAvatarError(null);
    try {
      const dataUrl = await resizeImage(file);
      await saveAvatar(dataUrl);
    } catch (_err) {
      setAvatarError(t("profile.avatarUploadError"));
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarSaving(true);
    setAvatarError(null);
    try {
      await saveAvatar(null);
    } catch (_err) {
      setAvatarError(t("profile.avatarRemoveError"));
    } finally {
      setAvatarSaving(false);
    }
  };

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
            <h2 className="section-title section-title-sm">{t("profile.summaryTitle")}</h2>
            <p className="section-subtitle">{t("profile.summarySubtitle")}</p>
          </div>
          <ButtonLink href="/app/onboarding">
            {t("profile.editProfile")}
          </ButtonLink>
        </div>
        {error ? (
          <div className="status-card status-card--warning">
            <div className="inline-actions-sm">
              <Icon name="warning" />
              <strong>{t("profile.errorTitle")}</strong>
            </div>
            <p className="muted">{error}</p>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              {t("ui.retry")}
            </Button>
          </div>
        ) : null}
        {loading ? (
          <div className="profile-avatar-card">
            <Skeleton className="profile-avatar-skeleton" />
            <div className="form-stack">
              <Skeleton variant="line" className="w-45" />
              <Skeleton variant="line" className="w-70" />
              <Skeleton variant="line" className="w-55" />
            </div>
          </div>
        ) : (
          <div className="profile-avatar-card">
            <div className="profile-avatar-preview">
              {avatarUrl ? (
                <img src={avatarUrl} alt={t("profile.avatarTitle")} />
              ) : (
                <div className="profile-avatar-fallback">
                  <Icon name="info" />
                </div>
              )}
            </div>
            <div className="profile-avatar-actions">
              <label className="form-stack">
                {t("profile.avatarUpload")}
                <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={avatarSaving} />
              </label>
              {avatarUrl ? (
                <Button variant="secondary" onClick={handleAvatarRemove} disabled={avatarSaving}>
                  {t("profile.avatarRemove")}
                </Button>
              ) : null}
              <span className="muted">{t("profile.avatarHint")}</span>
              {avatarError ? <span className="muted">{avatarError}</span> : null}
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="section-title section-title-xs">{t("profile.summaryBasics")}</h3>
        {loading ? (
          <div className="info-grid">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="info-item">
                <Skeleton variant="line" className="w-60" />
                <Skeleton variant="line" className="w-80" />
              </div>
            ))}
          </div>
        ) : (
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">{t("profile.name")}</div>
              <div className="info-value">{formatValue(profile.name)}</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("profile.sex")}</div>
              <div className="info-value">
                {profile.sex ? t(profile.sex === "female" ? "profile.sexFemale" : "profile.sexMale") : t("profile.noData")}
              </div>
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
                {profile.activity
                  ? t(
                      profile.activity === "sedentary"
                        ? "profile.activitySedentary"
                        : profile.activity === "light"
                          ? "profile.activityLight"
                          : profile.activity === "very"
                            ? "profile.activityVery"
                            : profile.activity === "extra"
                              ? "profile.activityExtra"
                              : "profile.activityModerate"
                    )
                  : t("profile.noData")}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="section-title section-title-xs">{t("profile.summaryGoals")}</h3>
        {loading ? (
          <div className="info-grid">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="info-item">
                <Skeleton variant="line" className="w-60" />
                <Skeleton variant="line" className="w-80" />
              </div>
            ))}
          </div>
        ) : (
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">{t("profile.goal")}</div>
              <div className="info-value">
                {profile.goal
                  ? t(profile.goal === "cut" ? "profile.goalCut" : profile.goal === "bulk" ? "profile.goalBulk" : "profile.goalMaintain")
                  : t("profile.noData")}
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
        )}
      </section>

      <section className="card">
        <h3 className="section-title section-title-xs">{t("profile.summaryTraining")}</h3>
        {loading ? (
          <div className="info-grid">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="info-item">
                <Skeleton variant="line" className="w-60" />
                <Skeleton variant="line" className="w-80" />
              </div>
            ))}
          </div>
        ) : (
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">{t("profile.trainingLevel")}</div>
              <div className="info-value">
                {profile.trainingPreferences.level
                  ? t(
                      profile.trainingPreferences.level === "beginner"
                        ? "profile.trainingLevelBeginner"
                        : profile.trainingPreferences.level === "intermediate"
                          ? "profile.trainingLevelIntermediate"
                          : "profile.trainingLevelAdvanced"
                    )
                  : t("profile.noData")}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("profile.trainingDays")}</div>
              <div className="info-value">{formatValue(profile.trainingPreferences.daysPerWeek)}</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("profile.trainingSessionTime")}</div>
              <div className="info-value">
                {profile.trainingPreferences.sessionTime
                  ? t(
                      profile.trainingPreferences.sessionTime === "short"
                        ? "profile.trainingSessionShort"
                        : profile.trainingPreferences.sessionTime === "long"
                          ? "profile.trainingSessionLong"
                          : "profile.trainingSessionMedium"
                    )
                  : t("profile.noData")}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("profile.trainingFocus")}</div>
              <div className="info-value">
                {profile.trainingPreferences.focus
                  ? t(
                      profile.trainingPreferences.focus === "ppl"
                        ? "profile.trainingFocusPpl"
                        : profile.trainingPreferences.focus === "upperLower"
                          ? "profile.trainingFocusUpperLower"
                          : "profile.trainingFocusFull"
                    )
                  : t("profile.noData")}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("profile.trainingEquipment")}</div>
              <div className="info-value">
                {profile.trainingPreferences.equipment
                  ? t(profile.trainingPreferences.equipment === "home" ? "profile.trainingEquipmentHome" : "profile.trainingEquipmentGym")
                  : t("profile.noData")}
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
                {profile.trainingPreferences.workoutLength
                  ? profile.trainingPreferences.workoutLength === "30m"
                    ? t("profile.workoutLength30")
                    : profile.trainingPreferences.workoutLength === "60m"
                      ? t("profile.workoutLength60")
                      : profile.trainingPreferences.workoutLength === "flexible"
                        ? t("profile.workoutLengthFlexible")
                        : t("profile.workoutLength45")
                  : t("profile.noData")}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("profile.timerSound")}</div>
              <div className="info-value">
                {profile.trainingPreferences.timerSound
                  ? t(profile.trainingPreferences.timerSound === "repsToDo" ? "profile.timerSoundReps" : "profile.timerSoundDing")
                  : t("profile.noData")}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="section-title section-title-xs">{t("profile.summaryNutrition")}</h3>
        {loading ? (
          <div className="info-grid">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="info-item">
                <Skeleton variant="line" className="w-60" />
                <Skeleton variant="line" className="w-80" />
              </div>
            ))}
          </div>
        ) : (
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">{t("profile.mealsPerDay")}</div>
              <div className="info-value">{formatValue(profile.nutritionPreferences.mealsPerDay)}</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("profile.dietTypeLabel")}</div>
              <div className="info-value">
                {profile.nutritionPreferences.dietType
                  ? t(`profile.dietType.${profile.nutritionPreferences.dietType}`)
                  : t("profile.noData")}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("profile.cookingTime")}</div>
              <div className="info-value">
                {profile.nutritionPreferences.cookingTime
                  ? t(
                      profile.nutritionPreferences.cookingTime === "quick"
                        ? "profile.cookingTimeOptionQuick"
                        : profile.nutritionPreferences.cookingTime === "long"
                          ? "profile.cookingTimeOptionLong"
                          : "profile.cookingTimeOptionMedium"
                    )
                  : t("profile.noData")}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("profile.mealDistributionLabel")}</div>
              <div className="info-value">
                {profile.nutritionPreferences.mealDistribution.preset
                  ? profile.nutritionPreferences.mealDistribution.preset === "custom"
                    ? t("profile.mealDistributionCustom")
                    : t(`profile.mealDistribution.${profile.nutritionPreferences.mealDistribution.preset}`)
                  : t("profile.noData")}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="section-title section-title-xs">{t("profile.summaryAllergies")}</h3>
        {loading ? (
          <div className="info-grid">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="info-item">
                <Skeleton variant="line" className="w-60" />
                <Skeleton variant="line" className="w-80" />
              </div>
            ))}
          </div>
        ) : (
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
        )}
      </section>

      <section className="card">
        <h3 className="section-title section-title-xs">{t("profile.summaryInjuries")}</h3>
        {loading ? (
          <div className="info-grid">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className="info-item">
                <Skeleton variant="line" className="w-60" />
                <Skeleton variant="line" className="w-80" />
              </div>
            ))}
          </div>
        ) : (
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
        )}
      </section>

      <section className="card">
        <h3 className="section-title section-title-xs">{t("profile.summaryMacros")}</h3>
        {loading ? (
          <div className="info-grid">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="info-item">
                <Skeleton variant="line" className="w-60" />
                <Skeleton variant="line" className="w-80" />
              </div>
            ))}
          </div>
        ) : (
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">{t("profile.macroFormula")}</div>
              <div className="info-value">
                {profile.macroPreferences.formula
                  ? t(profile.macroPreferences.formula === "katch" ? "profile.macroFormulaKatch" : "profile.macroFormulaMifflin")
                  : t("profile.noData")}
              </div>
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
        )}
      </section>

      <section className="card">
        <h3 className="section-title section-title-xs">{t("profile.latestMetricsTitle")}</h3>
        {loading ? (
          <div className="info-grid">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="info-item">
                <Skeleton variant="line" className="w-60" />
                <Skeleton variant="line" className="w-80" />
              </div>
            ))}
          </div>
        ) : (
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
        )}
      </section>
    </div>
  );
}
