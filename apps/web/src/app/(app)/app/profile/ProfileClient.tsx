"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import {
  defaultProfile,
  type Activity,
  type Goal,
  type MacroFormula,
  type ProfileData,
  type Sex,
  type TrainingEquipment,
  type TrainingFocus,
  type TrainingLevel,
  type SessionTime,
  type NutritionCookingTime,
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
        const response = await fetch("/api/tracking", { cache: "no-store" });
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
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{t("profile.trainingPrefsTitle")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label className="form-stack">
                {t("profile.goal")}
                <select
                  value={profile.trainingPreferences.goal}
                  onChange={(e) => updateTraining("goal", e.target.value as Goal)}
                >
                  <option value="cut">{t("profile.goalCut")}</option>
                  <option value="maintain">{t("profile.goalMaintain")}</option>
                  <option value="bulk">{t("profile.goalBulk")}</option>
                </select>
              </label>

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
                    updateTraining("daysPerWeek", Number(e.target.value) as 2 | 3 | 4 | 5)
                  }
                >
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
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
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{t("profile.nutritionPrefsTitle")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label className="form-stack">
                {t("profile.goal")}
                <select
                  value={profile.nutritionPreferences.goal}
                  onChange={(e) => updateNutrition("goal", e.target.value as Goal)}
                >
                  <option value="maintain">{t("profile.goalMaintain")}</option>
                  <option value="cut">{t("profile.goalCut")}</option>
                  <option value="bulk">{t("profile.goalBulk")}</option>
                </select>
              </label>

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
            </div>

            <div className="form-stack" style={{ marginTop: 12 }}>
              <label className="form-stack">
                {t("profile.dietaryPrefs")}
                <input
                  value={profile.nutritionPreferences.dietaryPrefs}
                  onChange={(e) => updateNutrition("dietaryPrefs", e.target.value)}
                  placeholder={t("profile.dietaryPrefsPlaceholder")}
                />
              </label>

              <label className="form-stack">
                {t("profile.dislikes")}
                <input
                  value={profile.nutritionPreferences.dislikes}
                  onChange={(e) => updateNutrition("dislikes", e.target.value)}
                  placeholder={t("profile.dislikesPlaceholder")}
                />
              </label>
            </div>
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
