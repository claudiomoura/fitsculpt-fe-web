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
  avatarDataUrl: string | null;
  measurements: {
    chestCm: number;
    waistCm: number;
    hipsCm: number;
    bicepsCm: number;
    thighCm: number;
    calfCm: number;
    neckCm: number;
    bodyFatPercent: number;
  };
};

type WeightEntry = {
  id: string;
  date: string;
  weightKg: number;
};

type CheckinEntry = {
  id: string;
  date: string;
  weightKg: number;
  waistCm: number;
  energy: number;
  hunger: number;
  notes: string;
  recommendation: string;
  frontPhotoUrl: string | null;
  sidePhotoUrl: string | null;
};

const STORAGE_KEY = "fs_profile_v1";
const HISTORY_KEY = "fs_weight_history_v1";
const CHECKIN_KEY = "fs_checkins_v1";

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
  avatarDataUrl: null,
  measurements: {
    chestCm: 0,
    waistCm: 0,
    hipsCm: 0,
    bicepsCm: 0,
    thighCm: 0,
    calfCm: 0,
    neckCm: 0,
    bodyFatPercent: 0,
  },
};

export default function ProfileClient() {
  const c = copy.es;
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<WeightEntry[]>([]);
  const [historyDate, setHistoryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [historyWeight, setHistoryWeight] = useState<number>(75);
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [checkinDate, setCheckinDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [checkinWeight, setCheckinWeight] = useState<number>(75);
  const [checkinWaist, setCheckinWaist] = useState<number>(80);
  const [checkinEnergy, setCheckinEnergy] = useState<number>(3);
  const [checkinHunger, setCheckinHunger] = useState<number>(3);
  const [checkinNotes, setCheckinNotes] = useState("");
  const [checkinFrontPhoto, setCheckinFrontPhoto] = useState<string | null>(null);
  const [checkinSidePhoto, setCheckinSidePhoto] = useState<string | null>(null);

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

  useEffect(() => {
    const stored = localStorage.getItem(CHECKIN_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as CheckinEntry[];
      if (Array.isArray(parsed)) setCheckins(parsed);
    } catch {
      setCheckins([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CHECKIN_KEY, JSON.stringify(checkins));
  }, [checkins]);

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

  function buildCheckinRecommendation(currentWeight: number) {
    if (checkins.length === 0) return c.profile.checkinKeep;
    const latest = [...checkins].sort((a, b) => b.date.localeCompare(a.date))[0];
    const delta = currentWeight - latest.weightKg;

    if (profile.goal === "cut") {
      if (delta >= 0) return c.profile.checkinReduceCalories;
      return c.profile.checkinKeep;
    }

    if (profile.goal === "bulk") {
      if (delta <= 0) return c.profile.checkinIncreaseCalories;
      return c.profile.checkinKeep;
    }

    if (checkinEnergy <= 2 || checkinHunger >= 4) return c.profile.checkinIncreaseProtein;
    return c.profile.checkinKeep;
  }

  function addCheckin(e: React.FormEvent) {
    e.preventDefault();
    const weight = Number(checkinWeight);
    const waist = Number(checkinWaist);
    if (!checkinDate || !Number.isFinite(weight)) return;

    const recommendation = buildCheckinRecommendation(weight);
    const entry: CheckinEntry = {
      id: `${checkinDate}-${Date.now()}`,
      date: checkinDate,
      weightKg: weight,
      waistCm: Number.isFinite(waist) ? waist : 0,
      energy: checkinEnergy,
      hunger: checkinHunger,
      notes: checkinNotes.trim(),
      recommendation,
      frontPhotoUrl: checkinFrontPhoto,
      sidePhotoUrl: checkinSidePhoto,
    };

    setCheckins((prev) => [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    setCheckinNotes("");
    setCheckinFrontPhoto(null);
    setCheckinSidePhoto(null);
  }

  function handleCheckinPhoto(
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: string | null) => void
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result || ""));
    reader.readAsDataURL(file);
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
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{c.profile.measurementsTitle}</h3>
            <p style={{ marginTop: 0 }}>{c.profile.measurementsSubtitle}</p>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  {c.profile.chest}
                  <input
                    type="number"
                    min={0}
                    value={profile.measurements.chestCm}
                    onChange={(e) => updateMeasurements("chestCm", Number(e.target.value))}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  {c.profile.waist}
                  <input
                    type="number"
                    min={0}
                    value={profile.measurements.waistCm}
                    onChange={(e) => updateMeasurements("waistCm", Number(e.target.value))}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  {c.profile.hips}
                  <input
                    type="number"
                    min={0}
                    value={profile.measurements.hipsCm}
                    onChange={(e) => updateMeasurements("hipsCm", Number(e.target.value))}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  {c.profile.biceps}
                  <input
                    type="number"
                    min={0}
                    value={profile.measurements.bicepsCm}
                    onChange={(e) => updateMeasurements("bicepsCm", Number(e.target.value))}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  {c.profile.thigh}
                  <input
                    type="number"
                    min={0}
                    value={profile.measurements.thighCm}
                    onChange={(e) => updateMeasurements("thighCm", Number(e.target.value))}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  {c.profile.calf}
                  <input
                    type="number"
                    min={0}
                    value={profile.measurements.calfCm}
                    onChange={(e) => updateMeasurements("calfCm", Number(e.target.value))}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  {c.profile.neck}
                  <input
                    type="number"
                    min={0}
                    value={profile.measurements.neckCm}
                    onChange={(e) => updateMeasurements("neckCm", Number(e.target.value))}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  {c.profile.bodyFat}
                  <input
                    type="number"
                    min={0}
                    max={60}
                    step="0.1"
                    value={profile.measurements.bodyFatPercent}
                    onChange={(e) => updateMeasurements("bodyFatPercent", Number(e.target.value))}
                  />
                </label>
              </div>
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

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{c.profile.checkinTitle}</h2>
        <p style={{ marginTop: 6 }}>{c.profile.checkinSubtitle}</p>

        <form onSubmit={addCheckin} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.checkinDate}
              <input
                type="date"
                value={checkinDate}
                onChange={(e) => setCheckinDate(e.target.value)}
                required
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.checkinWeight}
              <input
                type="number"
                min={30}
                max={250}
                step="0.1"
                value={checkinWeight}
                onChange={(e) => setCheckinWeight(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.checkinWaist}
              <input
                type="number"
                min={0}
                value={checkinWaist}
                onChange={(e) => setCheckinWaist(Number(e.target.value))}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.checkinEnergy}
              <input
                type="number"
                min={1}
                max={5}
                value={checkinEnergy}
                onChange={(e) => setCheckinEnergy(Number(e.target.value))}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            {c.profile.checkinHunger}
            <input
              type="number"
              min={1}
              max={5}
              value={checkinHunger}
              onChange={(e) => setCheckinHunger(Number(e.target.value))}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            {c.profile.checkinNotes}
            <textarea
              value={checkinNotes}
              onChange={(e) => setCheckinNotes(e.target.value)}
              rows={3}
            />
          </label>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 600 }}>{c.profile.checkinPhotos}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                {c.profile.checkinFrontPhoto}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCheckinPhoto(e, setCheckinFrontPhoto)}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                {c.profile.checkinSidePhoto}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCheckinPhoto(e, setCheckinSidePhoto)}
                />
              </label>
            </div>
            <span style={{ opacity: 0.7 }}>{c.profile.checkinPhotoHint}</span>
          </div>

          <button type="submit" style={{ width: "fit-content" }}>
            {c.profile.checkinAdd}
          </button>
        </form>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {checkins.length === 0 ? (
            <p style={{ opacity: 0.7 }}>{c.profile.checkinEmpty}</p>
          ) : (
            checkins.map((entry) => (
              <div
                key={entry.id}
                style={{ border: "1px solid #ededed", borderRadius: 10, padding: 12 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong>{entry.date}</strong>
                  <span>
                    {entry.weightKg} kg · {entry.waistCm} cm
                  </span>
                </div>
                <div style={{ marginTop: 6 }}>
                  {c.profile.checkinRecommendation}: <strong>{entry.recommendation}</strong>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                  {entry.frontPhotoUrl && (
                    <img
                      src={entry.frontPhotoUrl}
                      alt="Frontal"
                      style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8 }}
                    />
                  )}
                  {entry.sidePhotoUrl && (
                    <img
                      src={entry.sidePhotoUrl}
                      alt="Perfil"
                      style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8 }}
                    />
                  )}
                </div>
                {entry.notes && (
                  <p style={{ marginTop: 6, opacity: 0.75 }}>{entry.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
