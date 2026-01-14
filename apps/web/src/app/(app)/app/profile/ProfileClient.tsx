"use client";

import { useEffect, useState } from "react";
import { copy } from "@/lib/i18n";

type Goal = "cut" | "maintain" | "bulk";
type Activity = "sedentary" | "light" | "moderate" | "very" | "extra";

type ProfileData = {
  name: string;
  age: number;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  goal: Goal;
  activity: Activity;
  mealsPerDay: 1 | 2 | 3 | 4 | 5 | 6;
  dietaryPrefs: string;
  dislikes: string;
  notes: string;
};

type WeightEntry = {
  id: string;
  date: string;
  weightKg: number;
};

const STORAGE_KEY = "fs_profile_v1";
const HISTORY_KEY = "fs_weight_history_v1";

const defaultProfile: ProfileData = {
  name: "",
  age: 30,
  heightCm: 175,
  weightKg: 75,
  goalWeightKg: 70,
  goal: "maintain",
  activity: "moderate",
  mealsPerDay: 4,
  dietaryPrefs: "",
  dislikes: "",
  notes: "",
};

export default function ProfileClient() {
  const c = copy.es;
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<WeightEntry[]>([]);
  const [historyDate, setHistoryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [historyWeight, setHistoryWeight] = useState<number>(75);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as ProfileData;
      setProfile({ ...defaultProfile, ...parsed });
    } catch {
      setProfile(defaultProfile);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as WeightEntry[];
      if (Array.isArray(parsed)) setHistory(parsed);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function saveProfile() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  function resetProfile() {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(defaultProfile);
  }

  function addHistoryEntry(e: React.FormEvent) {
    e.preventDefault();
    const weight = Number(historyWeight);
    if (!historyDate || !Number.isFinite(weight)) return;

    const entry: WeightEntry = {
      id: `${historyDate}-${Date.now()}`,
      date: historyDate,
      weightKg: weight,
    };

    setHistory((prev) => {
      const next = [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date));
      return next;
    });
  }

  function removeHistoryEntry(id: string) {
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
  }

  const chartPoints = (() => {
    if (history.length === 0) return "";
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const weights = sorted.map((entry) => entry.weightKg);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = max - min || 1;
    const width = 420;
    const height = 160;
    return sorted
      .map((entry, index) => {
        const x = (index / Math.max(sorted.length - 1, 1)) * width;
        const y = height - ((entry.weightKg - min) / range) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  })();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.profile.formTitle}</h2>

        <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
          <div>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{c.profile.basicsTitle}</h3>
            <div style={{ display: "grid", gap: 12 }}>
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

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.profile.historyTitle}</h2>
        <p style={{ marginTop: 6 }}>{c.profile.historySubtitle}</p>

        <form
          onSubmit={addHistoryEntry}
          style={{ display: "grid", gap: 12, marginTop: 12 }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.historyDate}
              <input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                required
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.historyWeight}
              <input
                type="number"
                min={30}
                max={250}
                step="0.1"
                value={historyWeight}
                onChange={(e) => setHistoryWeight(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <button type="submit" style={{ width: "fit-content" }}>
            {c.profile.historyAdd}
          </button>
        </form>

        <div style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>{c.profile.historyChart}</h3>
          {history.length === 0 ? (
            <p style={{ opacity: 0.7 }}>{c.profile.historyEmpty}</p>
          ) : (
            <svg viewBox="0 0 420 160" width="100%" height="160">
              <polyline
                fill="none"
                stroke="#1f2937"
                strokeWidth="2"
                points={chartPoints}
              />
              {chartPoints
                .split(" ")
                .filter(Boolean)
                .map((point, idx) => {
                  const [x, y] = point.split(",");
                  return <circle key={idx} cx={x} cy={y} r="3" fill="#111827" />;
                })}
            </svg>
          )}
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {history.length === 0 ? null : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {history.map((entry) => (
                <li
                  key={entry.id}
                  style={{
                    border: "1px solid #ededed",
                    borderRadius: 10,
                    padding: "8px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span>
                    <strong>{entry.date}</strong> — {entry.weightKg} kg
                  </span>
                  <button type="button" onClick={() => removeHistoryEntry(entry.id)}>
                    {c.profile.historyDelete}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
