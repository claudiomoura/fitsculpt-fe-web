"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLanguage } from "@/context/LanguageProvider";
import { trackEvent } from "@/lib/analytics";
import { addDays, parseDate, startOfWeek, toDateKey } from "@/lib/calendar";
import { defaultProfile, type ProfileData } from "@/lib/profile";
import { compressAvatarToDataUrl } from "@/lib/avatarUpload";
import {
  getUserProfile,
  saveCheckinAndSyncProfileMetrics,
} from "@/lib/profileService";
import {
  buildPassiveHealthOverview,
  defaultPassiveHealthData,
} from "@/lib/passiveHealth";
import {
  buildProfessionalTrackingInsights,
  normalizeDailyCheckins,
} from "@/lib/trackingProfessionalMetrics";
import { getTrackingRangeConfig } from "@/lib/trackingProfessionalRules";
import {
  hasAiEntitlement,
  requestAiTrainingPlan,
  saveAiTrainingPlan,
  type AiEntitlementProfile,
} from "@/domains/ai";
import {
  canApplyTrainingAdjustment,
  generateAndSaveTrainingPlan,
  getTrainingAdjustmentInput,
  hasTrainingPlanAdjustmentCapability,
} from "@/domains/training";
import { Input } from "@/design-system/components/Input";
import { ErrorState, LoadingState } from "@/components/states";
import { defaultFoodProfiles } from "@/lib/foodProfiles";
import TrainingAdjustmentDiffSummary, {
  buildTrainingAdjustmentDiff,
  type TrainingAdjustmentDiff,
} from "@/components/tracking/TrainingAdjustmentDiffSummary";
import PassiveHealthSummaryCard from "@/components/tracking/PassiveHealthSummaryCard";
import TrackingProfessionalInsights from "@/components/tracking/TrackingProfessionalInsights";
import {
  type CheckinEntry,
  type FoodEntry,
  type MealLogEntry,
  type WorkoutEntry,
} from "@/services/tracking";
import { fetchAuthMe } from "@/lib/authDedup";
import styles from "./TrackingClient.module.css";

type CheckinMetrics = {
  weightKg: number;
  chestCm: number;
  waistCm: number;
  hipsCm: number;
  bicepsCm: number;
  thighCm: number;
  calfCm: number;
  neckCm: number;
  bodyFatPercent: number;
};

type UserFood = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: "100g" | "serving" | "unit";
  brand?: string | null;
};

type TrackingPayload = {
  checkins: CheckinEntry[];
  foodLog: FoodEntry[];
  workoutLog: WorkoutEntry[];
  mealLog: MealLogEntry[];
  passiveData?: {
    snapshots: Array<{
      id: string;
      date: string;
      source:
        | "manual"
        | "demo"
        | "apple_health"
        | "google_fit"
        | "health_connect"
        | "fitbit"
        | "garmin"
        | "smart_scale"
        | "wearable"
        | "other";
      provider: string | null;
      steps: number | null;
      activeCalories: number | null;
      activeMinutes: number | null;
      sleepHours: number | null;
      restingHeartRate: number | null;
      bodyWeightKg?: number | null;
      bodyFatPercent?: number | null;
      exerciseSessions: number;
      note: string;
      syncedAt: string;
    }>;
    lastSyncAt: string | null;
    lastSyncSource:
      | "manual"
      | "demo"
      | "apple_health"
      | "google_fit"
      | "health_connect"
      | "fitbit"
      | "garmin"
      | "smart_scale"
      | "wearable"
      | "other"
      | null;
  };
};

type PassivePayload = NonNullable<TrackingPayload["passiveData"]>;
type PassiveSnapshotPayload = PassivePayload["snapshots"][number];

type WorkoutDbItem = {
  id: string;
  name: string;
  notes?: string | null;
  durationMin?: number | null;
  scheduledAt?: string | null;
  sessions?: Array<{
    id: string;
    startedAt?: string | null;
    finishedAt?: string | null;
  }> | null;
};

type TrackingClientProps = {
  view?: "all" | "checkin";
};

function buildProfileSnapshotFallback(
  profile: ProfileData,
): CheckinEntry | null {
  const weightKg = Number(profile.weightKg ?? 0);
  const bodyFatPercent = Number(profile.measurements.bodyFatPercent ?? 0);
  const waistCm = Number(profile.measurements.waistCm ?? 0);
  const chestCm = Number(profile.measurements.chestCm ?? 0);
  const hipsCm = Number(profile.measurements.hipsCm ?? 0);
  const bicepsCm = Number(profile.measurements.bicepsCm ?? 0);
  const thighCm = Number(profile.measurements.thighCm ?? 0);
  const calfCm = Number(profile.measurements.calfCm ?? 0);
  const neckCm = Number(profile.measurements.neckCm ?? 0);

  const hasAnyMetric = [
    weightKg,
    bodyFatPercent,
    waistCm,
    chestCm,
    hipsCm,
    bicepsCm,
    thighCm,
    calfCm,
    neckCm,
  ].some((value) => Number.isFinite(value) && value > 0);

  if (!hasAnyMetric) return null;

  return {
    id: "profile-snapshot",
    date: new Date().toISOString().slice(0, 10),
    weightKg: Number.isFinite(weightKg) ? weightKg : 0,
    chestCm: Number.isFinite(chestCm) ? chestCm : 0,
    waistCm: Number.isFinite(waistCm) ? waistCm : 0,
    hipsCm: Number.isFinite(hipsCm) ? hipsCm : 0,
    bicepsCm: Number.isFinite(bicepsCm) ? bicepsCm : 0,
    thighCm: Number.isFinite(thighCm) ? thighCm : 0,
    calfCm: Number.isFinite(calfCm) ? calfCm : 0,
    neckCm: Number.isFinite(neckCm) ? neckCm : 0,
    bodyFatPercent: Number.isFinite(bodyFatPercent) ? bodyFatPercent : 0,
    energy: 0,
    hunger: 0,
    notes: "",
    recommendation: "",
    frontPhotoUrl: null,
    sidePhotoUrl: null,
  };
}

function normalizeWorkoutEntriesFromDb(
  workouts: WorkoutDbItem[] | null | undefined,
): WorkoutEntry[] {
  if (!Array.isArray(workouts)) return [];

  return workouts
    .flatMap((workout) => {
      const sessions = Array.isArray(workout.sessions) ? workout.sessions : [];
      return sessions
        .filter((session) =>
          Boolean(
            session.finishedAt || session.startedAt || workout.scheduledAt,
          ),
        )
        .map((session) => {
          const sourceDate =
            session.finishedAt ??
            session.startedAt ??
            workout.scheduledAt ??
            new Date().toISOString();
          return {
            id: session.id,
            date: sourceDate.slice(0, 10),
            name: workout.name,
            durationMin: Number(workout.durationMin ?? 0),
            notes: workout.notes ?? "",
          };
        });
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

type ProgressInsightTab = "checkin" | "nutrition" | "training";

function buildWeightTrendData(
  entries: Array<{ date: string; weightKg: number }>,
  rangeDays: number,
  formatEntryDate: (value: string) => string,
) {
  const rangeConfig = getTrackingRangeConfig(rangeDays);
  if (rangeConfig.chartGranularity === "day") {
    return entries.map((entry) => ({
      date: formatEntryDate(entry.date),
      weight: Number(entry.weightKg.toFixed(1)),
    }));
  }

  const grouped = new Map<
    string,
    { startDate: string; totalWeight: number; count: number }
  >();
  entries.forEach((entry) => {
    const parsed = parseDate(entry.date);
    if (!parsed) return;
    const bucketKey = toDateKey(startOfWeek(parsed, 1));
    const current = grouped.get(bucketKey) ?? {
      startDate: bucketKey,
      totalWeight: 0,
      count: 0,
    };
    current.totalWeight += entry.weightKg;
    current.count += 1;
    grouped.set(bucketKey, current);
  });

  return Array.from(grouped.values())
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((entry) => ({
      date: formatEntryDate(entry.startDate),
      weight: Number((entry.totalWeight / entry.count).toFixed(1)),
    }));
}

function buildNutritionTrendData(
  entries: Array<{ date: string; totals: { calories: number } }>,
  rangeDays: number,
  formatEntryDate: (value: string) => string,
) {
  const rangeConfig = getTrackingRangeConfig(rangeDays);
  if (rangeConfig.chartGranularity === "day") {
    return entries.map((entry) => ({
      date: formatEntryDate(entry.date),
      calories: Math.round(entry.totals.calories),
    }));
  }

  const grouped = new Map<string, { startDate: string; calories: number }>();
  entries.forEach((entry) => {
    const parsed = parseDate(entry.date);
    if (!parsed) return;
    const bucketKey = toDateKey(startOfWeek(parsed, 1));
    const current = grouped.get(bucketKey) ?? {
      startDate: bucketKey,
      calories: 0,
    };
    current.calories += entry.totals.calories;
    grouped.set(bucketKey, current);
  });

  return Array.from(grouped.values())
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((entry) => ({
      date: formatEntryDate(entry.startDate),
      calories: Math.round(entry.calories),
    }));
}

function buildTrainingTrendData(
  entries: WorkoutEntry[],
  rangeDays: number,
  formatEntryDate: (value: string) => string,
) {
  const rangeConfig = getTrackingRangeConfig(rangeDays);
  if (entries.length === 0)
    return [] as Array<{ date: string; sessions: number; minutes: number }>;

  const grouped = new Map<
    string,
    { startDate: string; sessions: number; minutes: number }
  >();
  entries.forEach((entry) => {
    const parsed = parseDate(entry.date);
    if (!parsed) return;
    const bucketDate =
      rangeConfig.chartGranularity === "day" ? parsed : startOfWeek(parsed, 1);
    const bucketKey = toDateKey(bucketDate);
    const current = grouped.get(bucketKey) ?? {
      startDate: bucketKey,
      sessions: 0,
      minutes: 0,
    };
    current.sessions += 1;
    current.minutes += Number(entry.durationMin) || 0;
    grouped.set(bucketKey, current);
  });

  return Array.from(grouped.values())
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((entry) => ({
      date: formatEntryDate(entry.startDate),
      sessions: entry.sessions,
      minutes: entry.minutes,
    }));
}

export default function TrackingClient({ view = "all" }: TrackingClientProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const isCheckinOnly = view === "checkin";
  const CHECKIN_MODE_KEY = "fs_checkin_mode_v1";
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [checkinDate, setCheckinDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [checkinWeight, setCheckinWeight] = useState(75);
  const [checkinChest, setCheckinChest] = useState(90);
  const [checkinWaist, setCheckinWaist] = useState(80);
  const [checkinHips, setCheckinHips] = useState(95);
  const [checkinBiceps, setCheckinBiceps] = useState(32);
  const [checkinThigh, setCheckinThigh] = useState(55);
  const [checkinCalf, setCheckinCalf] = useState(36);
  const [checkinNeck, setCheckinNeck] = useState(37);
  const [checkinBodyFat, setCheckinBodyFat] = useState(18);
  const [checkinEnergy, setCheckinEnergy] = useState(3);
  const [checkinHunger, setCheckinHunger] = useState(3);
  const [checkinNotes, setCheckinNotes] = useState("");
  const [checkinFrontPhotoUrl, setCheckinFrontPhotoUrl] = useState<string | null>(null);
  const [checkinSidePhotoUrl, setCheckinSidePhotoUrl] = useState<string | null>(null);
  const [checkinPhotoError, setCheckinPhotoError] = useState<string | null>(null);
  const [isCheckinPhotoProcessing, setIsCheckinPhotoProcessing] = useState(false);
  const [energyDate, setEnergyDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [energyValue, setEnergyValue] = useState(3);
  const [notesDate, setNotesDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [notesValue, setNotesValue] = useState("");
  const [progressRange, setProgressRange] = useState<"7" | "30" | "90">("30");
  const [progressInsightTab, setProgressInsightTab] =
    useState<ProgressInsightTab>("checkin");
  const [checkinMode, setCheckinMode] = useState<"quick" | "full">(() => {
    if (typeof window === "undefined") return "quick";
    const storedMode = window.localStorage.getItem(CHECKIN_MODE_KEY);
    return storedMode === "quick" || storedMode === "full"
      ? storedMode
      : "quick";
  });

  const [foodDate, setFoodDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [foodKey, setFoodKey] = useState("salmon");
  const [foodGrams, setFoodGrams] = useState(150);
  const [foodLog, setFoodLog] = useState<FoodEntry[]>([]);

  const [workoutDate, setWorkoutDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDuration, setWorkoutDuration] = useState(45);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [workoutLog, setWorkoutLog] = useState<WorkoutEntry[]>([]);
  const [mealLog, setMealLog] = useState<MealLogEntry[]>([]);
  const [passiveData, setPassiveData] = useState(defaultPassiveHealthData);
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [trackingLoaded, setTrackingLoaded] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [userFoods, setUserFoods] = useState<UserFood[]>([]);
  const [foodModalOpen, setFoodModalOpen] = useState(false);
  const [foodForm, setFoodForm] = useState({
    id: "",
    name: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    unit: "100g" as UserFood["unit"],
    brand: "",
  });
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isEnergySubmitting, setIsEnergySubmitting] = useState(false);
  const [energySubmitError, setEnergySubmitError] = useState<string | null>(
    null,
  );
  const [isNotesSubmitting, setIsNotesSubmitting] = useState(false);
  const [notesSubmitError, setNotesSubmitError] = useState<string | null>(null);
  const [adjustmentStatus, setAdjustmentStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [adjustmentSuccess, setAdjustmentSuccess] = useState<{
    at: string;
    period?: string;
  } | null>(null);
  const [adjustmentDiff, setAdjustmentDiff] =
    useState<TrainingAdjustmentDiff | null>(null);
  const [adjustmentCapabilityChecked, setAdjustmentCapabilityChecked] =
    useState(false);
  const [hasAdjustmentCapability, setHasAdjustmentCapability] = useState(false);
  const [adjustmentEntitlementChecked, setAdjustmentEntitlementChecked] =
    useState(false);
  const [hasAdjustmentEntitlement, setHasAdjustmentEntitlement] =
    useState(false);
  const [adjustmentTokenBalance, setAdjustmentTokenBalance] = useState<
    number | null
  >(null);
  const [trackingSupports, setTrackingSupports] = useState<{
    energy: boolean | null;
    notes: boolean | null;
    bodyFat: boolean | null;
    waist: boolean | null;
    measurements: boolean | null;
  }>({
    energy: null,
    notes: null,
    bodyFat: null,
    waist: null,
    measurements: null,
  });
  const supportsCheckinPhotos = true;
  const isMountedRef = useRef(true);

  const isWeightValid =
    Number.isFinite(checkinWeight) &&
    checkinWeight >= 30 &&
    checkinWeight <= 250;
  const isDateValid = Boolean(checkinDate);
  const isTrackingReady = trackingStatus === "ready";
  const isEnergyValid =
    Number.isFinite(energyValue) && energyValue >= 1 && energyValue <= 5;
  const isNotesValid = notesValue.trim().length > 0;
  const supportsBodyFat = trackingSupports.bodyFat === true;
  const supportsWaist = trackingSupports.waist === true;
  const supportsMeasurements = trackingSupports.measurements === true;
  const supportsEnergy = trackingSupports.energy === true;
  const supportsNotes = trackingSupports.notes === true;
  const isBodyFatValid =
    !supportsBodyFat ||
    (Number.isFinite(checkinBodyFat) &&
      checkinBodyFat >= 0 &&
      checkinBodyFat <= 60);
  const isWaistValid =
    !supportsWaist || (Number.isFinite(checkinWaist) && checkinWaist >= 0);
  const isWeightEntrySubmitDisabled =
    !isWeightValid || !isDateValid || isSubmitting;
  const isCheckinSubmitDisabled =
    !isWeightValid ||
    !isDateValid ||
    !isBodyFatValid ||
    !isWaistValid ||
    isSubmitting;

  const adjustmentInput = canApplyTrainingAdjustment(profile)
    ? getTrainingAdjustmentInput(profile)
    : null;
  const hasAdjustmentTokens =
    hasAdjustmentEntitlement || (adjustmentTokenBalance ?? 0) > 0;
  const canApplyAdjustment =
    adjustmentCapabilityChecked &&
    adjustmentEntitlementChecked &&
    hasAdjustmentCapability &&
    hasAdjustmentEntitlement &&
    hasAdjustmentTokens &&
    Boolean(adjustmentInput);
  const isApplyAdjustmentDisabled =
    adjustmentStatus === "loading" || !canApplyAdjustment;

  useEffect(() => {
    localStorage.setItem(CHECKIN_MODE_KEY, checkinMode);
  }, [checkinMode]);

  useEffect(() => {
    let active = true;
    const detectCapability = async () => {
      const hasCapability = await hasTrainingPlanAdjustmentCapability();
      if (!active) return;
      setHasAdjustmentCapability(hasCapability);
      setAdjustmentCapabilityChecked(true);
    };
    void detectCapability();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadEntitlement = async () => {
      try {
        const data = await fetchAuthMe();
        if (!active) return;
        setHasAdjustmentEntitlement(hasAiEntitlement(data));
        setAdjustmentTokenBalance(
          typeof data.aiTokenBalance === "number" ? data.aiTokenBalance : null,
        );
      } catch (_err) {
        if (!active) return;
        setHasAdjustmentEntitlement(false);
        setAdjustmentTokenBalance(null);
      } finally {
        if (active) setAdjustmentEntitlementChecked(true);
      }
    };
    void loadEntitlement();
    return () => {
      active = false;
    };
  }, []);

  function detectTrackingSupport(
    entries?: Array<Record<string, unknown>> | null,
  ) {
    if (!entries || entries.length === 0) {
      return {
        energy: false,
        notes: false,
        bodyFat: false,
        waist: false,
        measurements: false,
      };
    }
    const hasField = (field: string) =>
      entries.some((entry) =>
        Object.prototype.hasOwnProperty.call(entry, field),
      );
    const measurementFields = [
      "chestCm",
      "hipsCm",
      "bicepsCm",
      "thighCm",
      "calfCm",
      "neckCm",
    ];
    const supportsEnergy = hasField("energy");
    const supportsNotes = hasField("notes");
    const supportsBodyFat = hasField("bodyFatPercent");
    const supportsWaist = hasField("waistCm");
    const supportsMeasurements = measurementFields.some((field) =>
      hasField(field),
    );
    return {
      energy: supportsEnergy,
      notes: supportsNotes,
      bodyFat: supportsBodyFat,
      waist: supportsWaist,
      measurements: supportsMeasurements,
    };
  }

  async function refreshTrackingData(options?: {
    showLoading?: boolean;
    showError?: boolean;
  }) {
    const { showLoading = false, showError = false } = options ?? {};
    if (showLoading) {
      setTrackingStatus("loading");
    }
    try {
      const trackingResponse = await fetch("/api/tracking", {
        cache: "no-store",
        credentials: "include",
      });

      if (!trackingResponse.ok) {
        console.warn("Tracking load failed", trackingResponse.status);
        if (showError && isMountedRef.current) {
          setTrackingStatus("error");
        }
        return false;
      }
      const data = (await trackingResponse.json()) as TrackingPayload;
      if (!isMountedRef.current) return false;
      setCheckins(data.checkins ?? []);
      setFoodLog(data.foodLog ?? []);
      setWorkoutLog(data.workoutLog ?? []);
      setMealLog(data.mealLog ?? []);
      setPassiveData(data.passiveData ?? defaultPassiveHealthData);
      setTrackingSupports(
        detectTrackingSupport(data.checkins as Array<Record<string, unknown>>),
      );
      setTrackingLoaded(true);
      setTrackingStatus("ready");

      void (async () => {
        try {
          const workoutsResponse = await fetch("/api/workouts", {
            cache: "no-store",
            credentials: "include",
          });
          if (!workoutsResponse.ok || !isMountedRef.current) return;
          const workoutsPayload =
            (await workoutsResponse.json()) as WorkoutDbItem[];
          const persistedWorkoutEntries =
            normalizeWorkoutEntriesFromDb(workoutsPayload);
          if (persistedWorkoutEntries.length > 0 && isMountedRef.current) {
            setWorkoutLog(persistedWorkoutEntries);
          }
        } catch {
          // Tracking page should remain usable even if workout enrichment is slow.
        }
      })();

      return true;
    } catch (_err) {
      console.warn("Tracking load failed");
      if (showError && isMountedRef.current) {
        setTrackingStatus("error");
      }
      return false;
    }
  }

  useEffect(() => {
    let active = true;
    isMountedRef.current = true;

    const loadTracking = async () => {
      if (!active) return;
      await refreshTrackingData({ showLoading: true, showError: true });
    };

    const loadUserFoods = async () => {
      try {
        const response = await fetch("/api/user-foods", {
          cache: "no-store",
          credentials: "include",
        });
        if (!response.ok) return;
        const data = (await response.json()) as UserFood[];
        if (active) setUserFoods(data);
      } catch (_err) {
        // Ignore load errors.
      }
    };

    const loadProfile = async () => {
      try {
        const data = await getUserProfile();
        if (active) {
          setProfile(data);

          setCheckinWeight(Number(data.weightKg ?? 0));
          setCheckinChest(Number(data.measurements.chestCm ?? 0));
          setCheckinWaist(Number(data.measurements.waistCm ?? 0));
          setCheckinHips(Number(data.measurements.hipsCm ?? 0));
          setCheckinBiceps(Number(data.measurements.bicepsCm ?? 0));
          setCheckinThigh(Number(data.measurements.thighCm ?? 0));
          setCheckinCalf(Number(data.measurements.calfCm ?? 0));
          setCheckinNeck(Number(data.measurements.neckCm ?? 0));
          setCheckinBodyFat(Number(data.measurements.bodyFatPercent ?? 0));
        }
      } catch (_err) {
        // Ignore load errors.
      }
    };

    void loadTracking();
    void loadProfile();
    void loadUserFoods();
    return () => {
      active = false;
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!trackingLoaded) return;
    const timeout = window.setTimeout(() => {
      void fetch("/api/tracking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          checkins,
          foodLog,
          workoutLog,
          mealLog,
          passiveData,
        }),
      }).then((response) => {
        if (!response.ok) {
          console.warn("Tracking save failed", response.status);
        }
      });
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, [checkins, foodLog, workoutLog, mealLog, passiveData, trackingLoaded]);

  function buildRecommendation(currentWeight: number) {
    if (checkins.length === 0) return t("profile.checkinKeep");
    const latest = [...checkins].sort((a, b) =>
      b.date.localeCompare(a.date),
    )[0];
    const delta = currentWeight - latest.weightKg;
    if (profile.goal === "cut") {
      if (delta >= 0) return t("profile.checkinReduceCalories");
      return t("profile.checkinKeep");
    }

    if (profile.goal === "bulk") {
      if (delta <= 0) return t("profile.checkinIncreaseCalories");
      return t("profile.checkinKeep");
    }

    if (checkinEnergy <= 2 || checkinHunger >= 4)
      return t("profile.checkinIncreaseProtein");
    return t("profile.checkinKeep");
  }

  async function handleCheckinPhotoUpload(
    side: "front" | "side",
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCheckinPhotoError(null);
    setIsCheckinPhotoProcessing(true);
    try {
      const compressed = await compressAvatarToDataUrl(file);
      if (side === "front") {
        setCheckinFrontPhotoUrl(compressed);
      } else {
        setCheckinSidePhotoUrl(compressed);
      }
    } catch {
      setCheckinPhotoError(t("tracking.checkinPhotoUploadError"));
    } finally {
      setIsCheckinPhotoProcessing(false);
      event.target.value = "";
    }
  }

  async function addCheckin(e: React.FormEvent) {
    e.preventDefault();
    if (isCheckinSubmitDisabled) return;
    const recommendation = buildRecommendation(checkinWeight);
    const useAdvancedMetrics = checkinMode === "full" && supportsMeasurements;
    const resolvedMeasurements = {
      chestCm: useAdvancedMetrics
        ? Number(checkinChest)
        : Number(profile.measurements.chestCm ?? 0),
      hipsCm: useAdvancedMetrics
        ? Number(checkinHips)
        : Number(profile.measurements.hipsCm ?? 0),
      bicepsCm: useAdvancedMetrics
        ? Number(checkinBiceps)
        : Number(profile.measurements.bicepsCm ?? 0),
      thighCm: useAdvancedMetrics
        ? Number(checkinThigh)
        : Number(profile.measurements.thighCm ?? 0),
      calfCm: useAdvancedMetrics
        ? Number(checkinCalf)
        : Number(profile.measurements.calfCm ?? 0),
      neckCm: useAdvancedMetrics
        ? Number(checkinNeck)
        : Number(profile.measurements.neckCm ?? 0),
    };
    const resolvedWaist = supportsWaist
      ? Number(checkinWaist)
      : Number(profile.measurements.waistCm ?? 0);
    const resolvedBodyFat = supportsBodyFat
      ? Number(checkinBodyFat)
      : Number(profile.measurements.bodyFatPercent ?? 0);
    const resolvedEnergy = supportsEnergy
      ? Number(checkinEnergy)
      : Number(latestCheckin?.energy ?? 0);
    const resolvedHunger = supportsEnergy
      ? Number(checkinHunger)
      : Number(latestCheckin?.hunger ?? 0);
    const resolvedNotes = supportsNotes ? checkinNotes.trim() : "";
    const entry: CheckinEntry = {
      id: `${checkinDate}-${Date.now()}`,
      date: checkinDate,
      weightKg: Number(checkinWeight),
      chestCm: resolvedMeasurements.chestCm,
      waistCm: resolvedWaist,
      hipsCm: resolvedMeasurements.hipsCm,
      bicepsCm: resolvedMeasurements.bicepsCm,
      thighCm: resolvedMeasurements.thighCm,
      calfCm: resolvedMeasurements.calfCm,
      neckCm: resolvedMeasurements.neckCm,
      bodyFatPercent: resolvedBodyFat,
      energy: resolvedEnergy,
      hunger: resolvedHunger,
      notes: resolvedNotes,
      recommendation,
      frontPhotoUrl:
        checkinMode === "full" && supportsCheckinPhotos
          ? checkinFrontPhotoUrl
          : null,
      sidePhotoUrl:
        checkinMode === "full" && supportsCheckinPhotos
          ? checkinSidePhotoUrl
          : null,
    };

    const nextCheckins = [entry, ...checkins].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    const saved = await persistCheckin(nextCheckins, {
      weightKg: entry.weightKg,
      chestCm: entry.chestCm,
      waistCm: entry.waistCm,
      hipsCm: entry.hipsCm,
      bicepsCm: entry.bicepsCm,
      thighCm: entry.thighCm,
      calfCm: entry.calfCm,
      neckCm: entry.neckCm,
      bodyFatPercent: entry.bodyFatPercent,
    });
    if (saved) {
      setCheckinNotes("");
      setCheckinFrontPhotoUrl(null);
      setCheckinSidePhotoUrl(null);
      setCheckinPhotoError(null);
    }
  }

  function addFoodEntry(e: React.FormEvent) {
    e.preventDefault();
    const entry: FoodEntry = {
      id: `${foodDate}-${Date.now()}`,
      date: foodDate,
      foodKey,
      grams: Number(foodGrams),
    };
    setFoodLog((prev) => [entry, ...prev]);
  }

  function addWorkoutEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!workoutName.trim()) return;
    const entry: WorkoutEntry = {
      id: `${workoutDate}-${Date.now()}`,
      date: workoutDate,
      name: workoutName.trim(),
      durationMin: Number(workoutDuration),
      notes: workoutNotes.trim(),
    };
    setWorkoutLog((prev) => [entry, ...prev]);
    setWorkoutName("");
    setWorkoutNotes("");
  }

  async function savePassiveSnapshot(snapshot: PassiveSnapshotPayload) {
    const response = await fetch("/api/tracking/health/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(snapshot),
    });

    if (!response.ok) {
      showMessage(t("tracking.passiveSaveError"));
      return;
    }

    const data = (await response.json()) as PassivePayload;
    setPassiveData(data);
    showMessage(t("tracking.passiveSaveSuccess"));
  }

  async function replacePassiveSync(snapshots: PassivePayload["snapshots"]) {
    const response = await fetch("/api/tracking/health", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        snapshots,
        lastSyncAt: new Date().toISOString(),
        lastSyncSource: snapshots[0]?.source ?? "demo",
      }),
    });

    if (!response.ok) {
      showMessage(t("tracking.passiveSaveError"));
      return;
    }

    const data = (await response.json()) as PassivePayload;
    setPassiveData(data);
    showMessage(t("tracking.passiveDemoSuccess"));
  }

  const userFoodMap = useMemo(
    () => new Map(userFoods.map((food) => [food.id, food])),
    [userFoods],
  );

  function resolveFoodProfile(key: string) {
    if (key.startsWith("user:")) {
      const id = key.replace("user:", "");
      const food = userFoodMap.get(id);
      if (!food) return null;
      return {
        label: food.name,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        calories: food.calories,
      };
    }
    const profile = defaultFoodProfiles[key];
    if (!profile) return null;
    const calories = profile.protein * 4 + profile.carbs * 4 + profile.fat * 9;
    return {
      label: t(profile.labelKey),
      protein: profile.protein,
      carbs: profile.carbs,
      fat: profile.fat,
      calories,
    };
  }

  function showMessage(message: string) {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 2000);
  }

  async function persistCheckin(
    nextCheckins: CheckinEntry[],
    metrics: CheckinMetrics,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      onError?: (message: string) => void;
      setSubmitting?: (value: boolean) => void;
    },
  ) {
    const successMessage =
      options?.successMessage ?? t("tracking.weightEntrySuccess");
    const errorMessage =
      options?.errorMessage ?? t("tracking.weightEntryError");
    const setSubmitting = options?.setSubmitting ?? setIsSubmitting;
    setSubmitting(true);
    if (!options?.onError) {
      setSubmitError(null);
    }
    try {
      const nextProfile = await saveCheckinAndSyncProfileMetrics(
        { checkins: nextCheckins, foodLog, workoutLog, mealLog },
        profile,
        metrics,
      );
      setProfile(nextProfile);
      const refreshed = await refreshTrackingData({
        showLoading: true,
        showError: true,
      });
      if (!refreshed) {
        if (options?.onError) {
          options.onError(errorMessage);
        } else {
          setSubmitError(errorMessage);
        }
        return false;
      }
      showMessage(successMessage);
      trackEvent("checkin_saved", {
        target: "checkin",
        origin: isCheckinOnly ? "checkin_page" : "tracking",
        mode: checkinMode,
      });
      if (isCheckinOnly) {
        router.push("/app/hoy?checkin=success");
      }
      return true;
    } catch (_err) {
      if (options?.onError) {
        options.onError(errorMessage);
      } else {
        setSubmitError(errorMessage);
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEntry(
    collection: "checkins" | "foodLog" | "workoutLog",
    id: string,
  ) {
    const confirmed = window.confirm(t("tracking.deleteConfirm"));
    if (!confirmed) return;
    const response = await fetch(`/api/tracking/${collection}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      showMessage(t("tracking.deleteError"));
      return;
    }
    if (collection === "checkins") {
      setCheckins((prev) => prev.filter((entry) => entry.id !== id));
    } else if (collection === "foodLog") {
      setFoodLog((prev) => prev.filter((entry) => entry.id !== id));
    } else {
      setWorkoutLog((prev) => prev.filter((entry) => entry.id !== id));
    }
    showMessage(t("tracking.deleteSuccess"));
  }

  function openFoodModal(food?: UserFood) {
    if (food) {
      setFoodForm({
        id: food.id,
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        unit: food.unit,
        brand: food.brand ?? "",
      });
    } else {
      setFoodForm({
        id: "",
        name: "",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        unit: "100g",
        brand: "",
      });
    }
    setFoodModalOpen(true);
  }

  async function handleSaveFood(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: foodForm.name.trim(),
      calories: Number(foodForm.calories),
      protein: Number(foodForm.protein),
      carbs: Number(foodForm.carbs),
      fat: Number(foodForm.fat),
      unit: foodForm.unit,
      brand: foodForm.brand.trim() || null,
    };
    if (!payload.name) return;
    const isEditing = Boolean(foodForm.id);
    const response = await fetch(
      isEditing ? `/api/user-foods/${foodForm.id}` : "/api/user-foods",
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      showMessage(t("tracking.foodSaveError"));
      return;
    }
    const data = (await response.json()) as UserFood;
    setUserFoods((prev) => {
      const next = isEditing
        ? prev.map((item) => (item.id === data.id ? data : item))
        : [data, ...prev];
      return next;
    });
    setFoodModalOpen(false);
    showMessage(
      isEditing ? t("tracking.foodUpdated") : t("tracking.foodCreated"),
    );
  }

  const mealsByDate = useMemo(() => {
    return mealLog.reduce<Record<string, MealLogEntry[]>>((acc, entry) => {
      acc[entry.date] = acc[entry.date] ? [...acc[entry.date], entry] : [entry];
      return acc;
    }, {});
  }, [mealLog]);

  function macroTotals(entries: MealLogEntry[]) {
    return entries.reduce(
      (totals, entry) => ({
        protein: totals.protein + Number(entry.protein ?? 0),
        carbs: totals.carbs + Number(entry.carbs ?? 0),
        fat: totals.fat + Number(entry.fats ?? 0),
        calories: totals.calories + Number(entry.calories ?? 0),
      }),
      { protein: 0, carbs: 0, fat: 0, calories: 0 },
    );
  }

  const nutritionTargets = profile.nutritionPlan
    ? {
        calories: profile.nutritionPlan.dailyCalories,
        protein: profile.nutritionPlan.proteinG,
        carbs: profile.nutritionPlan.carbsG,
        fat: profile.nutritionPlan.fatG,
      }
    : null;

  const checkinAnalysisSource = useMemo(() => {
    if (checkins.length > 0) return checkins;
    const fallback = buildProfileSnapshotFallback(profile);
    return fallback ? [fallback] : [];
  }, [checkins, profile]);

  const normalizedCheckins = useMemo(
    () => normalizeDailyCheckins(checkinAnalysisSource),
    [checkinAnalysisSource],
  );
  const rangeConfig = useMemo(
    () => getTrackingRangeConfig(Number(progressRange)),
    [progressRange],
  );

  const checkinsInRange = useMemo(() => {
    if (normalizedCheckins.length === 0) return [];
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = addDays(endDate, -(rangeConfig.days - 1));
    startDate.setHours(0, 0, 0, 0);
    return normalizedCheckins.filter((entry) => {
      const parsed = parseDate(entry.date);
      return parsed ? parsed >= startDate && parsed <= endDate : false;
    });
  }, [normalizedCheckins, rangeConfig.days]);

  const checkinChart = useMemo(() => {
    if (checkinsInRange.length === 0) return [];
    const sorted = [...checkinsInRange]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((entry) => Number.isFinite(entry.weightKg));
    if (sorted.length === 0) return [];
    const weights = sorted.map((entry) => entry.weightKg);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = Math.max(1, max - min);
    return sorted.map((entry) => ({
      date: entry.date,
      weight: entry.weightKg,
      bodyFat: supportsBodyFat ? entry.bodyFatPercent : null,
      percent: ((entry.weightKg - min) / range) * 100,
    }));
  }, [checkinsInRange, supportsBodyFat]);

  const fallbackProfileCheckin = useMemo(
    () => buildProfileSnapshotFallback(profile),
    [profile],
  );
  const sortedCheckins = useMemo(() => {
    const source =
      checkins.length > 0
        ? checkins
        : fallbackProfileCheckin
          ? [fallbackProfileCheckin]
          : [];
    return [...source].sort((a, b) => b.date.localeCompare(a.date));
  }, [checkins, fallbackProfileCheckin]);
  const checkinPhotosAvailable = useMemo(
    () =>
      sortedCheckins.filter(
        (entry) => Boolean(entry.frontPhotoUrl) || Boolean(entry.sidePhotoUrl),
      ),
    [sortedCheckins],
  );
  const currentCheckinPhoto = checkinPhotosAvailable[0] ?? null;
  const baselineCheckinPhoto =
    checkinPhotosAvailable.length > 1
      ? checkinPhotosAvailable[checkinPhotosAvailable.length - 1]
      : null;
  const professionalInsights = useMemo(
    () =>
      buildProfessionalTrackingInsights({
        checkins: checkinAnalysisSource,
        mealLog,
        workoutLog,
        profile,
        rangeDays: Number(progressRange),
      }),
    [checkinAnalysisSource, mealLog, workoutLog, profile, progressRange],
  );
  const latestCheckin = sortedCheckins[0];
  const rangeLatestCheckin = checkinsInRange[0] ?? null;
  const rangeFirstCheckin = checkinChart[0] ?? null;
  const rangeLastCheckin = checkinChart[checkinChart.length - 1] ?? null;
  const rangeWeightDelta =
    rangeFirstCheckin && rangeLastCheckin
      ? rangeLastCheckin.weight - rangeFirstCheckin.weight
      : null;
  const rangeCheckinConsistency = useMemo(() => {
    return Math.min(
      100,
      Math.round(
        (checkinsInRange.length / Math.max(1, rangeConfig.days)) * 100,
      ),
    );
  }, [checkinsInRange.length, rangeConfig.days]);
  const latestNotesCheckin =
    checkinsInRange.find((entry) => entry.notes?.trim()) ??
    sortedCheckins.find((entry) => entry.notes?.trim());
  const baseWeight = Number(latestCheckin?.weightKg ?? profile.weightKg ?? 0);
  const hasBaseWeight =
    Number.isFinite(baseWeight) && baseWeight >= 30 && baseWeight <= 250;
  const isEnergySubmitDisabled =
    !supportsEnergy ||
    !isTrackingReady ||
    !isEnergyValid ||
    !energyDate ||
    !hasBaseWeight ||
    isEnergySubmitting;
  const isNotesSubmitDisabled =
    !supportsNotes ||
    !isTrackingReady ||
    !isNotesValid ||
    !notesDate ||
    !hasBaseWeight ||
    isNotesSubmitting;
  const isTrackingLoading = trackingStatus === "loading";
  const isTrackingError = trackingStatus === "error";
  const rangeDays = rangeConfig.days;
  const daysBackForRange = Math.max(0, rangeDays - 1);
  const passiveRangeEnd = toDateKey(new Date());
  const passiveRangeStart = toDateKey(addDays(new Date(), -daysBackForRange));
  const passiveOverview = useMemo(
    () =>
      buildPassiveHealthOverview(passiveData, {
        startDate: passiveRangeStart,
        endDate: passiveRangeEnd,
        targetSessions: Number(profile.trainingPreferences.daysPerWeek ?? 0),
      }),
    [
      passiveData,
      passiveRangeEnd,
      passiveRangeStart,
      profile.trainingPreferences.daysPerWeek,
    ],
  );

  if (isTrackingLoading && !trackingLoaded) {
    return (
      <div
        className={
          isCheckinOnly
            ? `${styles.checkinOnlyBody} nutrition-page-shell`
            : styles.trackingPageContent
        }
        data-testid="tracking-page-loading"
      >
        <LoadingState title={t("profile.checkinTitle")} ariaLabel={t("ui.loading")} lines={4} />
      </div>
    );
  }

  if (isTrackingError && !trackingLoaded) {
    return (
      <div
        className={
          isCheckinOnly
            ? `${styles.checkinOnlyBody} nutrition-page-shell`
            : styles.trackingPageContent
        }
        data-testid="tracking-page-error"
      >
        <ErrorState
          title={t("tracking.errorTitle")}
          description={t("dashboard.chartError")}
          retryLabel={t("common.retry")}
          onRetry={() => {
            void refreshTrackingData({ showLoading: true, showError: true });
          }}
          wrapInCard
        />
      </div>
    );
  }

  const formatEntryDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  };

  const nutritionDateTotals = Object.entries(mealsByDate)
    .map(([date, entries]) => ({ date, totals: macroTotals(entries) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const nutritionInRange = nutritionDateTotals.filter((entry) => {
    const parsed = parseDate(entry.date);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - daysBackForRange);
    return parsed ? parsed >= cutoff : false;
  });
  const nutritionDaysLogged = nutritionInRange.length;
  const nutritionTotals = nutritionInRange.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.totals.calories,
      protein: acc.protein + entry.totals.protein,
      carbs: acc.carbs + entry.totals.carbs,
      fat: acc.fat + entry.totals.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const nutritionAverages =
    nutritionDaysLogged > 0
      ? {
          calories: nutritionTotals.calories / nutritionDaysLogged,
          protein: nutritionTotals.protein / nutritionDaysLogged,
        }
      : { calories: 0, protein: 0 };
  const nutritionLoggingAdherence = Math.round(
    (nutritionDaysLogged / Math.max(1, rangeDays)) * 100,
  );
  const nutritionCaloriesTargetAdherence =
    nutritionTargets && nutritionDaysLogged > 0
      ? Math.round(
          (nutritionInRange.filter(
            (entry) =>
              entry.totals.calories >= nutritionTargets.calories * 0.9 &&
              entry.totals.calories <= nutritionTargets.calories * 1.1,
          ).length /
            nutritionDaysLogged) *
            100,
        )
      : null;
  const nutritionProteinTargetAdherence =
    nutritionTargets && nutritionDaysLogged > 0
      ? Math.round(
          (nutritionInRange.filter(
            (entry) => entry.totals.protein >= nutritionTargets.protein * 0.9,
          ).length /
            nutritionDaysLogged) *
            100,
        )
      : null;

  const workoutsSorted = [...workoutLog].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const workoutsInRange = workoutsSorted.filter((entry) => {
    const parsed = parseDate(entry.date);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - daysBackForRange);
    return parsed ? parsed >= cutoff : false;
  });
  const trainingSessions = workoutsInRange.length;
  const trainingMinutes = workoutsInRange.reduce(
    (sum, entry) => sum + entry.durationMin,
    0,
  );
  const trainingAverageMinutes =
    trainingSessions > 0 ? Math.round(trainingMinutes / trainingSessions) : 0;
  const targetSessions = Math.max(
    1,
    Number(profile.trainingPreferences.daysPerWeek ?? 3),
  );
  const targetSessionsForRange = Math.max(
    1,
    Math.round((targetSessions * rangeDays) / 7),
  );
  const trainingConsistency = Math.min(
    100,
    Math.round((trainingSessions / targetSessionsForRange) * 100),
  );
  const workoutsRecent = workoutsInRange.slice(0, 5);

  const checkinTrendData = buildWeightTrendData(
    checkinChart.map((point) => ({ date: point.date, weightKg: point.weight })),
    rangeDays,
    formatEntryDate,
  );

  const nutritionTrendData = buildNutritionTrendData(
    nutritionInRange,
    rangeDays,
    formatEntryDate,
  );

  const trainingTrendData = buildTrainingTrendData(
    workoutsInRange,
    rangeDays,
    formatEntryDate,
  );

  async function addQuickWeightEntry(e: React.FormEvent) {
    e.preventDefault();
    if (isWeightEntrySubmitDisabled) return;
    const recommendation = buildRecommendation(checkinWeight);
    const entry: CheckinEntry = {
      id: `${checkinDate}-${Date.now()}`,
      date: checkinDate,
      weightKg: Number(checkinWeight),
      chestCm: Number(profile.measurements.chestCm ?? 0),
      waistCm: Number(profile.measurements.waistCm ?? 0),
      hipsCm: Number(profile.measurements.hipsCm ?? 0),
      bicepsCm: Number(profile.measurements.bicepsCm ?? 0),
      thighCm: Number(profile.measurements.thighCm ?? 0),
      calfCm: Number(profile.measurements.calfCm ?? 0),
      neckCm: Number(profile.measurements.neckCm ?? 0),
      bodyFatPercent: Number(profile.measurements.bodyFatPercent ?? 0),
      energy: Number(checkinEnergy),
      hunger: Number(checkinHunger),
      notes: "",
      recommendation,
      frontPhotoUrl: null,
      sidePhotoUrl: null,
    };
    const nextCheckins = [entry, ...checkins].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    await persistCheckin(nextCheckins, {
      weightKg: entry.weightKg,
      chestCm: entry.chestCm,
      waistCm: entry.waistCm,
      hipsCm: entry.hipsCm,
      bicepsCm: entry.bicepsCm,
      thighCm: entry.thighCm,
      calfCm: entry.calfCm,
      neckCm: entry.neckCm,
      bodyFatPercent: entry.bodyFatPercent,
    });
  }

  async function addEnergyEntry(e: React.FormEvent) {
    e.preventDefault();
    if (isEnergySubmitDisabled) return;
    setEnergySubmitError(null);
    const recommendation = buildRecommendation(baseWeight);
    const entry: CheckinEntry = {
      id: `${energyDate}-${Date.now()}`,
      date: energyDate,
      weightKg: baseWeight,
      chestCm: Number(profile.measurements.chestCm ?? 0),
      waistCm: Number(profile.measurements.waistCm ?? 0),
      hipsCm: Number(profile.measurements.hipsCm ?? 0),
      bicepsCm: Number(profile.measurements.bicepsCm ?? 0),
      thighCm: Number(profile.measurements.thighCm ?? 0),
      calfCm: Number(profile.measurements.calfCm ?? 0),
      neckCm: Number(profile.measurements.neckCm ?? 0),
      bodyFatPercent: Number(profile.measurements.bodyFatPercent ?? 0),
      energy: Number(energyValue),
      hunger: Number(checkinHunger),
      notes: "",
      recommendation,
      frontPhotoUrl: null,
      sidePhotoUrl: null,
    };
    const nextCheckins = [entry, ...checkins].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    const saved = await persistCheckin(
      nextCheckins,
      {
        weightKg: entry.weightKg,
        chestCm: entry.chestCm,
        waistCm: entry.waistCm,
        hipsCm: entry.hipsCm,
        bicepsCm: entry.bicepsCm,
        thighCm: entry.thighCm,
        calfCm: entry.calfCm,
        neckCm: entry.neckCm,
        bodyFatPercent: entry.bodyFatPercent,
      },
      {
        successMessage: t("tracking.energyEntrySuccess"),
        errorMessage: t("tracking.energyEntryError"),
        onError: setEnergySubmitError,
        setSubmitting: setIsEnergySubmitting,
      },
    );
    if (saved) {
      setEnergyValue(3);
    }
  }

  async function addNotesEntry(e: React.FormEvent) {
    e.preventDefault();
    if (isNotesSubmitDisabled) return;
    const trimmedNotes = notesValue.trim();
    if (!trimmedNotes) return;
    setNotesSubmitError(null);
    const recommendation = buildRecommendation(baseWeight);
    const entry: CheckinEntry = {
      id: `${notesDate}-${Date.now()}`,
      date: notesDate,
      weightKg: baseWeight,
      chestCm: Number(profile.measurements.chestCm ?? 0),
      waistCm: Number(profile.measurements.waistCm ?? 0),
      hipsCm: Number(profile.measurements.hipsCm ?? 0),
      bicepsCm: Number(profile.measurements.bicepsCm ?? 0),
      thighCm: Number(profile.measurements.thighCm ?? 0),
      calfCm: Number(profile.measurements.calfCm ?? 0),
      neckCm: Number(profile.measurements.neckCm ?? 0),
      bodyFatPercent: Number(profile.measurements.bodyFatPercent ?? 0),
      energy: Number(checkinEnergy),
      hunger: Number(checkinHunger),
      notes: trimmedNotes,
      recommendation,
      frontPhotoUrl: null,
      sidePhotoUrl: null,
    };
    const nextCheckins = [entry, ...checkins].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    const saved = await persistCheckin(
      nextCheckins,
      {
        weightKg: entry.weightKg,
        chestCm: entry.chestCm,
        waistCm: entry.waistCm,
        hipsCm: entry.hipsCm,
        bicepsCm: entry.bicepsCm,
        thighCm: entry.thighCm,
        calfCm: entry.calfCm,
        neckCm: entry.neckCm,
        bodyFatPercent: entry.bodyFatPercent,
      },
      {
        successMessage: t("tracking.notesEntrySuccess"),
        errorMessage: t("tracking.notesEntryError"),
        onError: setNotesSubmitError,
        setSubmitting: setIsNotesSubmitting,
      },
    );
    if (saved) {
      setNotesValue("");
    }
  }

  const formatLocalDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString();
  };

  const translateWithDate = (key: string, date: string) =>
    t(key).replace("{date}", date);

  const resolvePeriodText = (metadata: {
    effectiveFrom?: string;
    weekStart?: string;
  }) => {
    const source = metadata.effectiveFrom ?? metadata.weekStart;
    if (!source) return undefined;
    const formatted = formatLocalDate(source);
    return formatted
      ? translateWithDate("tracking.adjustmentPeriod", formatted)
      : undefined;
  };

  async function handleApplyAdjustment() {
    if (
      !canApplyAdjustment ||
      !adjustmentInput ||
      adjustmentStatus === "loading"
    )
      return;
    setAdjustmentStatus("loading");
    setAdjustmentError(null);
    setAdjustmentSuccess(null);
    setAdjustmentDiff(null);
    try {
      const previousPlan = profile.trainingPlan;
      const result = await generateAndSaveTrainingPlan(
        profile,
        adjustmentInput,
      );
      const refreshedTracking = await refreshTrackingData({
        showLoading: true,
        showError: true,
      });
      const refreshedProfile = await getUserProfile();
      if (!refreshedTracking) {
        setAdjustmentStatus("error");
        setAdjustmentError(t("tracking.adjustmentRefreshError"));
        return;
      }
      setProfile(refreshedProfile);
      const successDate =
        formatLocalDate(
          result.metadata.updatedAt ?? new Date().toISOString(),
        ) ??
        formatLocalDate(new Date().toISOString()) ??
        new Date().toLocaleDateString();
      setAdjustmentSuccess({
        at: successDate,
        period: resolvePeriodText(result.metadata),
      });
      setAdjustmentDiff(
        buildTrainingAdjustmentDiff(previousPlan, result.profile.trainingPlan),
      );
      setAdjustmentStatus("success");
      router.refresh();
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_TOKENS") {
        setAdjustmentError(t("ai.insufficientTokens"));
      } else {
        setAdjustmentError(t("tracking.adjustmentError"));
      }
      setAdjustmentStatus("error");
    }
  }

  return (
    <div
      className={
        isCheckinOnly
          ? `${styles.checkinOnlyBody} nutrition-page-shell`
          : styles.trackingPageContent
      }
      data-testid="tracking-page"
    >
      {actionMessage && !isCheckinOnly && (
        <div
          className="status-card status-card--success"
          role="status"
          aria-live="polite"
        >
          <p className="muted m-0">{actionMessage}</p>
        </div>
      )}
      {!isCheckinOnly ? (
        <section
          className={`card premium-surface-card surface-content-card ${styles.heroCard} ${styles.quickCheckinHero}`}
        >
          <div className={styles.heroHeader}>
            <div>
              <h2 className="section-title m-0">{t("profile.checkinTitle")}</h2>
              <p className="section-subtitle m-0">
                {t("tracking.weightEntrySubtitle")}
              </p>
            </div>
            <div className={styles.heroPrimaryActionWrap}>
              <button
                type="button"
                className={`btn ${styles.heroPrimaryAction}`}
                onClick={() => router.push("/app/seguimiento/check-in")}
              >
                {t("today.checkinPrimaryCta")}
              </button>
            </div>
          </div>

          {latestCheckin ? (
            <div className={styles.checkinLatestPill}>
              <span className="muted">{t("tracking.latestWeightTitle")}</span>
              <strong>
                {latestCheckin.weightKg.toFixed(1)} {t("units.kilograms")}
              </strong>
            </div>
          ) : (
            <p className="muted m-0">{t("tracking.latestWeightEmpty")}</p>
          )}

          <Link className={styles.heroSecondaryLink} href="/app/weekly-review">
            {t("nav.weeklyReview")}
          </Link>

          <div
            className={styles.segmentedControl}
            role="tablist"
            aria-label="Rango"
          >
            {(
              [
                { id: "7", label: "Semana" },
                { id: "30", label: "Mes" },
                { id: "90", label: "3 meses" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.segmentedButton} ${progressRange === option.id ? styles.segmentedButtonActive : ""}`}
                onClick={() => setProgressRange(option.id)}
                role="tab"
                aria-selected={progressRange === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!isCheckinOnly ? (
        <PassiveHealthSummaryCard
          passiveData={passiveData}
          overview={passiveOverview}
          endDate={passiveRangeEnd}
          onSaveSnapshot={savePassiveSnapshot}
          onLoadDemo={replacePassiveSync}
          disabled={trackingStatus === "loading"}
        />
      ) : null}

      {!isCheckinOnly ? (
        <section className={`${styles.trackingOverviewCard}`}>
          <div
            className={styles.insightTabs}
            role="tablist"
            aria-label={t("tracking.insightsLabel")}
          >
            {(
              [
                { id: "checkin", label: t("tracking.progressTabCheckin") },
                { id: "nutrition", label: t("tracking.progressTabNutrition") },
                { id: "training", label: t("tracking.progressTabTraining") },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.insightTabButton} ${progressInsightTab === option.id ? styles.insightTabButtonActive : ""}`}
                onClick={() =>
                  setProgressInsightTab(option.id as ProgressInsightTab)
                }
                role="tab"
                aria-selected={progressInsightTab === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>

          {progressInsightTab === "checkin" ? (
            <div className={styles.checkinInsightStack}>
              <div className={styles.overviewGrid}>
                <div className={styles.leftColumn}>
                  <section
                    className={`feature-card feature-card--compact ${styles.primaryChartCard}`}
                  >
                    <h2 className="section-title section-title-sm">
                      {t("tracking.weeklyProgressTitle")}
                    </h2>
                    {checkinTrendData.length < 2 ? (
                      <p className="muted">
                        {t("tracking.weeklyProgressEmpty")}
                      </p>
                    ) : (
                      <div className={styles.chartWrap}>
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart
                            data={checkinTrendData}
                            margin={{ top: 8, right: 4, left: -14, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient
                                id="tracking-weight-area"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="var(--accent)"
                                  stopOpacity={0.36}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="var(--accent)"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              stroke="color-mix(in srgb, var(--border) 65%, transparent)"
                              strokeDasharray="3 3"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="date"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                              width={38}
                              domain={["dataMin - 0.6", "dataMax + 0.6"]}
                            />
                            <Tooltip
                              formatter={(value) => {
                                const numericValue = Number(value ?? 0);
                                return [
                                  `${numericValue.toFixed(1)} ${t("units.kilograms")}`,
                                  t("tracking.latestWeightTitle"),
                                ];
                              }}
                              labelFormatter={(label) => String(label)}
                              contentStyle={{
                                borderRadius: 12,
                                border:
                                  "1px solid color-mix(in srgb, var(--border) 85%, transparent)",
                                background: "var(--bg-card)",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="weight"
                              stroke="var(--accent)"
                              strokeWidth={2.25}
                              fill="url(#tracking-weight-area)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </section>
                  <section className={styles.metricCards}>
                    <article className="feature-card feature-card--compact">
                      <p className="muted">{t("tracking.latestWeightTitle")}</p>
                      <strong>
                        {rangeLatestCheckin
                          ? `${rangeLatestCheckin.weightKg.toFixed(1)} ${t("units.kilograms")}`
                          : "—"}
                      </strong>
                    </article>
                    <article className="feature-card feature-card--compact">
                      <p className="muted">
                        {t("tracking.weightHistoryTitle")}
                      </p>
                      <strong>
                        {rangeWeightDelta === null
                          ? "—"
                          : `${rangeWeightDelta > 0 ? "+" : ""}${rangeWeightDelta.toFixed(1)} ${t("units.kilograms")}`}
                      </strong>
                    </article>
                    <article className="feature-card feature-card--compact">
                      <p className="muted">
                        {t("tracking.progressConsistency")}
                      </p>
                      <strong>{rangeCheckinConsistency}%</strong>
                    </article>
                  </section>
                </div>
                <aside className={styles.rightColumn}>
                  {supportsBodyFat && rangeLatestCheckin ? (
                    <section className="feature-card feature-card--compact">
                      <h3 className="section-title section-title-sm">
                        {t("tracking.bodyFatPercent")}
                      </h3>
                      <strong>
                        {rangeLatestCheckin.bodyFatPercent.toFixed(1)}
                        {t("units.percent")}
                      </strong>
                    </section>
                  ) : null}
                  {latestNotesCheckin ? (
                    <section className="feature-card feature-card--compact">
                      <h3 className="section-title section-title-sm">
                        {t("tracking.latestNotesTitle")}
                      </h3>
                      <p className="muted">{latestNotesCheckin.notes}</p>
                    </section>
                  ) : null}
                  <section className="feature-card feature-card--compact">
                    <h3 className="section-title section-title-sm">
                      {t("tracking.weightHistoryTitle")}
                    </h3>
                    {professionalInsights.historyRows.length === 0 ? (
                      <p className="muted">{t("profile.checkinEmpty")}</p>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {professionalInsights.historyRows
                          .slice(0, 5)
                          .map((entry) => (
                            <div key={entry.id} className="info-item">
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 10,
                                }}
                              >
                                <strong>{formatEntryDate(entry.date)}</strong>
                                <span className="muted">
                                  {entry.weightKg.toFixed(1)}{" "}
                                  {t("units.kilograms")}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </section>
                </aside>
              </div>
              <TrackingProfessionalInsights insights={professionalInsights} />
            </div>
          ) : null}

          {progressInsightTab === "nutrition" ? (
            <div className={styles.overviewGrid}>
              <div className={styles.leftColumn}>
                <section
                  className={`feature-card feature-card--compact ${styles.primaryChartCard}`}
                >
                  <h3 className="section-title section-title-sm">
                    {t("tracking.progressComplianceTitle")}
                  </h3>
                  {nutritionTrendData.length === 0 ? (
                    <p className="muted">{t("tracking.mealEmpty")}</p>
                  ) : (
                    <div className={styles.chartWrap}>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={nutritionTrendData}
                          margin={{ top: 8, right: 4, left: -14, bottom: 0 }}
                        >
                          <CartesianGrid
                            stroke="color-mix(in srgb, var(--border) 65%, transparent)"
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                            width={38}
                          />
                          <Tooltip
                            formatter={(value) => {
                              const numericValue = Number(value ?? 0);
                              return [
                                `${Math.round(numericValue)} ${t("units.kcal")}`,
                                t("tracking.progressAverageCalories"),
                              ];
                            }}
                            labelFormatter={(label) => String(label)}
                            contentStyle={{
                              borderRadius: 12,
                              border:
                                "1px solid color-mix(in srgb, var(--border) 85%, transparent)",
                              background: "var(--bg-card)",
                            }}
                          />
                          <Bar
                            dataKey="calories"
                            radius={[8, 8, 0, 0]}
                            fill="var(--accent)"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </section>

                <section className={styles.metricCards}>
                  <article className="feature-card feature-card--compact">
                    <p className="muted">{t("tracking.progressDaysLogged")}</p>
                    <strong>
                      {nutritionDaysLogged}/{rangeDays}
                    </strong>
                  </article>
                  <article className="feature-card feature-card--compact">
                    <p className="muted">
                      {t("tracking.progressAverageCalories")}
                    </p>
                    <strong>
                      {nutritionDaysLogged > 0
                        ? `${nutritionAverages.calories.toFixed(0)} ${t("units.kcal")}`
                        : "—"}
                    </strong>
                  </article>
                  <article className="feature-card feature-card--compact">
                    <p className="muted">
                      {t("tracking.progressAverageProtein")}
                    </p>
                    <strong>
                      {nutritionDaysLogged > 0
                        ? `${nutritionAverages.protein.toFixed(0)} ${t("units.grams")}`
                        : "—"}
                    </strong>
                  </article>
                </section>
              </div>
              <aside className={styles.rightColumn}>
                <section className="feature-card feature-card--compact">
                  <h3 className="section-title section-title-sm">
                    {t("tracking.progressComplianceTitle")}
                  </h3>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div
                      className="info-item"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <span className="muted">
                        {t("tracking.progressLoggingLabel")}
                      </span>
                      <strong>{nutritionLoggingAdherence}%</strong>
                    </div>
                    {nutritionCaloriesTargetAdherence !== null ? (
                      <div
                        className="info-item"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <span className="muted">
                          {t("tracking.progressCaloriesTargetLabel")}
                        </span>
                        <strong>{nutritionCaloriesTargetAdherence}%</strong>
                      </div>
                    ) : null}
                    {nutritionProteinTargetAdherence !== null ? (
                      <div
                        className="info-item"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <span className="muted">
                          {t("tracking.progressProteinTargetLabel")}
                        </span>
                        <strong>{nutritionProteinTargetAdherence}%</strong>
                      </div>
                    ) : null}
                  </div>
                </section>
                <section className="feature-card feature-card--compact">
                  <h3 className="section-title section-title-sm">
                    {t("tracking.progressRecentMeals")}
                  </h3>
                  {nutritionInRange.length === 0 ? (
                    <p className="muted">{t("tracking.mealEmpty")}</p>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {nutritionInRange
                        .slice(-5)
                        .reverse()
                        .map((entry) => (
                          <div key={entry.date} className="info-item">
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <strong>{formatEntryDate(entry.date)}</strong>
                              <span className="muted">
                                {entry.totals.calories.toFixed(0)}{" "}
                                {t("units.kcal")}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </section>
              </aside>
            </div>
          ) : null}

          {progressInsightTab === "training" ? (
            <div className={styles.overviewGrid}>
              <div className={styles.leftColumn}>
                <section
                  className={`feature-card feature-card--compact ${styles.primaryChartCard}`}
                >
                  <h3 className="section-title section-title-sm">
                    {t("tracking.progressSessionTarget")}
                  </h3>
                  {trainingTrendData.length === 0 ? (
                    <p className="muted">{t("tracking.workoutEmpty")}</p>
                  ) : (
                    <div className={styles.chartWrap}>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={trainingTrendData}
                          margin={{ top: 8, right: 4, left: -14, bottom: 0 }}
                        >
                          <CartesianGrid
                            stroke="color-mix(in srgb, var(--border) 65%, transparent)"
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                            width={32}
                            allowDecimals={false}
                          />
                          <Tooltip
                            formatter={(value, key) => {
                              const numericValue = Number(value ?? 0);
                              const metric =
                                key === "sessions"
                                  ? t("tracking.progressSessions")
                                  : t("tracking.progressTrainingTime");
                              return [
                                key === "sessions"
                                  ? `${numericValue} ${t("tracking.progressSessions")}`
                                  : `${numericValue} min`,
                                metric,
                              ];
                            }}
                            labelFormatter={(label) => String(label)}
                            contentStyle={{
                              borderRadius: 12,
                              border:
                                "1px solid color-mix(in srgb, var(--border) 85%, transparent)",
                              background: "var(--bg-card)",
                            }}
                          />
                          <Bar
                            dataKey="sessions"
                            radius={[8, 8, 0, 0]}
                            fill="var(--accent)"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </section>
                <section className={styles.metricCards}>
                  <article className="feature-card feature-card--compact">
                    <p className="muted">{t("tracking.progressSessions")}</p>
                    <strong>{trainingSessions}</strong>
                  </article>
                  <article className="feature-card feature-card--compact">
                    <p className="muted">
                      {t("tracking.progressTrainingTime")}
                    </p>
                    <strong>{trainingMinutes} min</strong>
                  </article>
                  <article className="feature-card feature-card--compact">
                    <p className="muted">{t("tracking.workoutDuration")}</p>
                    <strong>
                      {trainingAverageMinutes > 0
                        ? `${trainingAverageMinutes} min`
                        : "—"}
                    </strong>
                  </article>
                  <article className="feature-card feature-card--compact">
                    <p className="muted">{t("tracking.progressConsistency")}</p>
                    <strong>{trainingConsistency}%</strong>
                  </article>
                </section>
              </div>
              <aside className={styles.rightColumn}>
                <section className="feature-card feature-card--compact">
                  <h3 className="section-title section-title-sm">
                    {t("tracking.progressSessionTarget")}
                  </h3>
                  <div
                    className="info-item"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <span className="muted">
                      {t("tracking.progressPerWeek")}
                    </span>
                    <strong>{targetSessions}</strong>
                  </div>
                  <div
                    className="info-item"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <span className="muted">
                      {t("tracking.progressConsistency")}
                    </span>
                    <strong>{trainingConsistency}%</strong>
                  </div>
                </section>
                <section className="feature-card feature-card--compact">
                  <h3 className="section-title section-title-sm">
                    {t("tracking.progressRecentWorkouts")}
                  </h3>
                  {workoutsRecent.length === 0 ? (
                    <p className="muted">{t("tracking.workoutEmpty")}</p>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {workoutsRecent.map((entry) => (
                        <div key={entry.id} className="info-item">
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                            }}
                          >
                            <strong>{entry.name}</strong>
                            <span className="muted">
                              {entry.durationMin} min
                            </span>
                          </div>
                          <span className="muted">
                            {formatEntryDate(entry.date)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </aside>
            </div>
          ) : null}
        </section>
      ) : null}

      {isCheckinOnly ? (
        <section
          className={`${styles.checkinShell} premium-fade-up`}
          id="checkin-entry"
        >
          <div className="flex justify-end">
            <button type="button" className="btn secondary fit-content" onClick={() => router.back()}>{t("ui.close")}</button>
          </div>
          <div className={styles.checkinHero}>
            <div>
              <h2 className="section-title" style={{ fontSize: 22 }}>
                {t("profile.checkinTitle")}
              </h2>
              <p className="section-subtitle">{t("profile.checkinSubtitle")}</p>
            </div>
            {latestCheckin ? (
              <div className={styles.checkinLatestPill}>
                <span className="muted">{t("tracking.latestWeightTitle")}</span>
                <strong>
                  {latestCheckin.weightKg.toFixed(1)} {t("units.kilograms")}
                </strong>
              </div>
            ) : null}
          </div>

          <div className={styles.checkinModeGrid}>
            <button
              type="button"
              className={`${styles.checkinModeCard} ${checkinMode === "quick" ? styles.checkinModeCardActive : ""}`}
              onClick={() => setCheckinMode("quick")}
              aria-pressed={checkinMode === "quick"}
            >
              <strong>{t("tracking.checkinModeQuick")}</strong>
              <span className="muted">
                {t("tracking.checkinModeQuickHint")}
              </span>
            </button>
            <button
              type="button"
              className={`${styles.checkinModeCard} ${checkinMode === "full" ? styles.checkinModeCardActive : ""}`}
              onClick={() => setCheckinMode("full")}
              aria-pressed={checkinMode === "full"}
            >
              <strong>{t("tracking.checkinModeFull")}</strong>
              <span className="muted">{t("tracking.checkinModeFullHint")}</span>
            </button>
          </div>

          <form
            onSubmit={
              checkinMode === "quick" ? addQuickWeightEntry : addCheckin
            }
            className="form-stack"
          >
            <div className={styles.checkinFormGrid}>
              <Input
                type="date"
                label={t("profile.checkinDate")}
                value={checkinDate}
                onChange={(e) => setCheckinDate(e.target.value)}
              />
              <Input
                type="number"
                min={30}
                max={250}
                step="0.1"
                label={t("profile.checkinWeight")}
                value={checkinWeight}
                onChange={(e) => setCheckinWeight(Number(e.target.value))}
                errorText={
                  !isWeightValid && isTrackingReady
                    ? t("tracking.weightEntryInvalid")
                    : undefined
                }
              />
              {checkinMode === "full" ? (
                <>
                  <label className="form-stack">
                    {t("profile.bodyFat")}
                    <input
                      type="number"
                      min={0}
                      max={60}
                      step="0.1"
                      value={checkinBodyFat}
                      onChange={(e) =>
                        setCheckinBodyFat(Number(e.target.value))
                      }
                      aria-invalid={!isBodyFatValid && isTrackingReady}
                    />
                  </label>
                  <label className="form-stack">
                    {t("tracking.checkinWaistOptional")}
                    <input
                      type="number"
                      min={0}
                      value={checkinWaist}
                      onChange={(e) => setCheckinWaist(Number(e.target.value))}
                      aria-invalid={!isWaistValid && isTrackingReady}
                    />
                  </label>
                  <label className="form-stack">
                    {t("tracking.chestCm")}
                    <input
                      type="number"
                      min={0}
                      value={checkinChest}
                      onChange={(e) => setCheckinChest(Number(e.target.value))}
                    />
                  </label>
                  <label className="form-stack">
                    {t("tracking.hipsCm")}
                    <input
                      type="number"
                      min={0}
                      value={checkinHips}
                      onChange={(e) => setCheckinHips(Number(e.target.value))}
                    />
                  </label>
                  <label className="form-stack">
                    {t("tracking.bicepsCm")}
                    <input
                      type="number"
                      min={0}
                      value={checkinBiceps}
                      onChange={(e) => setCheckinBiceps(Number(e.target.value))}
                    />
                  </label>
                  <label className="form-stack">
                    {t("tracking.thighCm")}
                    <input
                      type="number"
                      min={0}
                      value={checkinThigh}
                      onChange={(e) => setCheckinThigh(Number(e.target.value))}
                    />
                  </label>
                  <label className="form-stack">
                    {t("tracking.calfCm")}
                    <input
                      type="number"
                      min={0}
                      value={checkinCalf}
                      onChange={(e) => setCheckinCalf(Number(e.target.value))}
                    />
                  </label>
                  <label className="form-stack">
                    {t("tracking.neckCm")}
                    <input
                      type="number"
                      min={0}
                      value={checkinNeck}
                      onChange={(e) => setCheckinNeck(Number(e.target.value))}
                    />
                  </label>
                  <label className="form-stack">
                    {t("profile.checkinEnergy")}
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={checkinEnergy}
                      onChange={(e) => setCheckinEnergy(Number(e.target.value))}
                    />
                  </label>
                  <label className="form-stack">
                    {t("profile.checkinHunger")}
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={checkinHunger}
                      onChange={(e) => setCheckinHunger(Number(e.target.value))}
                    />
                  </label>
                </>
              ) : null}
            </div>

            {!isBodyFatValid && isTrackingReady ? (
              <p className="muted">{t("tracking.bodyFatInvalid")}</p>
            ) : null}
            {checkinMode === "full" ? (
              <label className="form-stack">
                {t("profile.checkinNotes")}
                <textarea
                  value={checkinNotes}
                  onChange={(e) => setCheckinNotes(e.target.value)}
                  rows={3}
                />
              </label>
            ) : null}
            {checkinMode === "full" && supportsCheckinPhotos ? (
              <div className={styles.photoUploadSection}>
                <h3 className="section-title section-title-sm">
                  {t("tracking.checkinPhotoUploadTitle")}
                </h3>
                <p className="muted">{t("tracking.checkinPhotoConsent")}</p>
                <div className={styles.photoUploadGrid}>
                  <label className={styles.photoUploadField}>
                    <span>{t("tracking.checkinFrontPhotoLabel")}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(event) =>
                        void handleCheckinPhotoUpload("front", event)
                      }
                    />
                  </label>
                  <label className={styles.photoUploadField}>
                    <span>{t("tracking.checkinSidePhotoLabel")}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(event) =>
                        void handleCheckinPhotoUpload("side", event)
                      }
                    />
                  </label>
                </div>
                {isCheckinPhotoProcessing ? (
                  <p className="muted">{t("tracking.checkinPhotoProcessing")}</p>
                ) : null}
                {checkinPhotoError ? (
                  <p className="muted">{checkinPhotoError}</p>
                ) : null}
                <div className={styles.photoPreviewGrid}>
                  {checkinFrontPhotoUrl ? (
                    <img
                      src={checkinFrontPhotoUrl}
                      alt={t("tracking.checkinFrontPhotoLabel")}
                      className={styles.photoPreview}
                    />
                  ) : null}
                  {checkinSidePhotoUrl ? (
                    <img
                      src={checkinSidePhotoUrl}
                      alt={t("tracking.checkinSidePhotoLabel")}
                      className={styles.photoPreview}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
            {submitError ? (
              <div className="status-card status-card--warning" role="alert">
                <p className="muted m-0">{submitError}</p>
              </div>
            ) : null}
            {actionMessage ? (
              <div
                className="status-card status-card--success"
                role="status"
                aria-live="polite"
              >
                <p className="muted m-0">{actionMessage}</p>
              </div>
            ) : null}

            <button
              type="submit"
              data-testid={
                checkinMode === "quick"
                  ? "checkin-quick-submit"
                  : "checkin-full-submit"
              }
              className={`btn ${isSubmitting ? "is-loading" : ""}`}
              style={{ width: "fit-content" }}
              disabled={
                checkinMode === "quick"
                  ? isWeightEntrySubmitDisabled
                  : isCheckinSubmitDisabled
              }
            >
              {isSubmitting ? (
                <>
                  <span className="ui-spinner" aria-hidden="true" />{" "}
                  {t("tracking.weightEntrySaving")}
                </>
              ) : checkinMode === "quick" ? (
                t("tracking.weightEntryCta")
              ) : (
                t("profile.checkinAdd")
              )}
            </button>
          </form>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {currentCheckinPhoto && baselineCheckinPhoto ? (
              <div className={styles.photoComparisonCard}>
                <h3 className="section-title section-title-sm">
                  {t("tracking.checkinPhotoCompareTitle")}
                </h3>
                <p className="muted">{t("tracking.checkinPhotoCompareSubtitle")}</p>
                <div className={styles.photoCompareGrid}>
                  <div className={styles.photoCompareColumn}>
                    <strong>
                      {t("tracking.checkinPhotoCompareBaseline", {
                        date: baselineCheckinPhoto.date,
                      })}
                    </strong>
                    <div className={styles.photoPreviewGrid}>
                      {baselineCheckinPhoto.frontPhotoUrl ? (
                        <img
                          src={baselineCheckinPhoto.frontPhotoUrl}
                          alt={t("tracking.checkinFrontPhotoLabel")}
                          className={styles.photoPreview}
                        />
                      ) : null}
                      {baselineCheckinPhoto.sidePhotoUrl ? (
                        <img
                          src={baselineCheckinPhoto.sidePhotoUrl}
                          alt={t("tracking.checkinSidePhotoLabel")}
                          className={styles.photoPreview}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className={styles.photoCompareColumn}>
                    <strong>
                      {t("tracking.checkinPhotoCompareCurrent", {
                        date: currentCheckinPhoto.date,
                      })}
                    </strong>
                    <div className={styles.photoPreviewGrid}>
                      {currentCheckinPhoto.frontPhotoUrl ? (
                        <img
                          src={currentCheckinPhoto.frontPhotoUrl}
                          alt={t("tracking.checkinFrontPhotoLabel")}
                          className={styles.photoPreview}
                        />
                      ) : null}
                      {currentCheckinPhoto.sidePhotoUrl ? (
                        <img
                          src={currentCheckinPhoto.sidePhotoUrl}
                          alt={t("tracking.checkinSidePhotoLabel")}
                          className={styles.photoPreview}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {sortedCheckins.length === 0 ? (
              <div className="empty-state">
                <p className="muted">{t("profile.checkinEmpty")}</p>
              </div>
            ) : (
              professionalInsights.historyRows.slice(0, 8).map((entry) => (
                <div
                  key={entry.id}
                  className="feature-card feature-card--compact"
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <strong>{entry.date}</strong>
                    <span>
                      {[
                        `${entry.weightKg} ${t("units.kilograms")}`,
                        supportsWaist
                          ? `${entry.waistCm} ${t("units.centimeters")}`
                          : null,
                        supportsBodyFat
                          ? `${entry.bodyFatPercent}${t("units.percent")}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  {entry.notes ? (
                    <p style={{ marginTop: 6 }} className="muted">
                      {entry.notes}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
