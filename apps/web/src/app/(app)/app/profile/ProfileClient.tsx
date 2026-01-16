"use client";

import { useEffect, useState } from "react";
import { copy } from "@/lib/i18n";
import { defaultProfile, type Activity, type Goal, type ProfileData } from "@/lib/profile";

export default function ProfileClient() {
  const c = copy.es;
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [saved, setSaved] = useState(false);
  const [latestCheckinDate, setLatestCheckinDate] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as Partial<ProfileData> | null;
        if (active && data) {
          setProfile({
            ...defaultProfile,
            ...data,
            measurements: {
              ...defaultProfile.measurements,
              ...data.measurements,
            },
          });
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

  async function saveProfile() {
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (response.ok) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    }
  }

  async function resetProfile() {
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(defaultProfile),
    });
    if (response.ok) {
      setProfile(defaultProfile);
    }
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((prev) => ({ ...prev, avatarDataUrl: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setProfile((prev) => ({ ...prev, avatarDataUrl: null }));
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.profile.formTitle}</h2>

        <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
          <div>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{c.profile.basicsTitle}</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 600 }}>{c.profile.avatarTitle}</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {profile.avatarDataUrl ? (
                    <img
                      src={profile.avatarDataUrl}
                      alt="Avatar"
                      style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: "#f3f4f6",
                        display: "grid",
                        placeItems: "center",
                        color: "#6b7280",
                        fontSize: 12,
                      }}
                    >
                      {c.profile.avatarTitle}
                    </div>
                  )}
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                      {c.profile.avatarUpload}
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} />
                    </label>
                    {profile.avatarDataUrl && (
                      <button type="button" onClick={removeAvatar}>
                        {c.profile.avatarRemove}
                      </button>
                    )}
                    <span style={{ opacity: 0.7 }}>{c.profile.avatarHint}</span>
                  </div>
                </div>
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                {c.profile.name}
                <input
                  value={profile.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Ej: Laura Gómez"
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  {c.profile.age}
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={profile.age}
                    onChange={(e) => update("age", Number(e.target.value))}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  {c.profile.height}
                  <input
                    type="number"
                    min={120}
                    max={230}
                    value={profile.heightCm}
                    onChange={(e) => update("heightCm", Number(e.target.value))}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  {c.profile.weight}
                  <input
                    type="number"
                    min={35}
                    max={250}
                    value={profile.weightKg}
                    onChange={(e) => update("weightKg", Number(e.target.value))}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  {c.profile.goalWeight}
                  <input
                    type="number"
                    min={35}
                    max={250}
                    value={profile.goalWeightKg}
                    onChange={(e) => update("goalWeightKg", Number(e.target.value))}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  {c.profile.goal}
                  <select value={profile.goal} onChange={(e) => update("goal", e.target.value as Goal)}>
                    <option value="cut">{c.profile.goalCut}</option>
                    <option value="maintain">{c.profile.goalMaintain}</option>
                    <option value="bulk">{c.profile.goalBulk}</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  {c.profile.activity}
                  <select
                    value={profile.activity}
                    onChange={(e) => update("activity", e.target.value as Activity)}
                  >
                    <option value="sedentary">{c.profile.activitySedentary}</option>
                    <option value="light">{c.profile.activityLight}</option>
                    <option value="moderate">{c.profile.activityModerate}</option>
                    <option value="very">{c.profile.activityVery}</option>
                    <option value="extra">{c.profile.activityExtra}</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{c.profile.preferencesTitle}</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                {c.profile.mealsPerDay}
                <select
                  value={profile.mealsPerDay}
                  onChange={(e) =>
                    update("mealsPerDay", Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6)
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

              <label style={{ display: "grid", gap: 6 }}>
                {c.profile.dietaryPrefs}
                <input
                  value={profile.dietaryPrefs}
                  onChange={(e) => update("dietaryPrefs", e.target.value)}
                  placeholder={c.profile.dietaryPrefsPlaceholder}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                {c.profile.dislikes}
                <input
                  value={profile.dislikes}
                  onChange={(e) => update("dislikes", e.target.value)}
                  placeholder={c.profile.dislikesPlaceholder}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                {c.profile.notes}
                <textarea
                  value={profile.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder={c.profile.notesPlaceholder}
                  rows={3}
                />
              </label>
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{c.profile.latestMetricsTitle}</h3>
            <p style={{ marginTop: 0 }}>{c.profile.latestMetricsHint}</p>
            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <strong>{c.profile.weight}:</strong> {profile.weightKg} kg
              </div>
              <div>
                <strong>{c.profile.waist}:</strong> {profile.measurements.waistCm} cm
              </div>
              <div>
                <strong>{c.profile.chest}:</strong> {profile.measurements.chestCm} cm
              </div>
              <div>
                <strong>{c.profile.hips}:</strong> {profile.measurements.hipsCm} cm
              </div>
              <div>
                <strong>{c.profile.bodyFat}:</strong> {profile.measurements.bodyFatPercent}%
              </div>
              {latestCheckinDate && (
                <div style={{ opacity: 0.75 }}>
                  {c.profile.checkinDate}: {latestCheckinDate}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="button" onClick={saveProfile}>
              {c.profile.save}
            </button>
            <button type="button" onClick={resetProfile}>
              {c.profile.reset}
            </button>
            {saved && <span style={{ opacity: 0.7 }}>{c.profile.savedToast}</span>}
          </div>
        </div>
      </div>

    </div>
  );
}
