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
  defaultPassiveHealthData,
} from "@/lib/passiveHealth";
import { getTrackingRangeConfig } from "@/lib/trackingProfessionalRules";
import {
  hasAiEntitlement,
} from "@/domains/ai";
import {
  consumeTrackingRecommendationForAiPlan,
  buildTrackingBodyScanCapability,
  estimateTrackingBodyScanTokens,
  buildTrackingProfileSnapshotFallback,
  buildTrackingRecommendationCapability,
  detectTrackingSupport,
  loadTrackingProjectionCapability,
  selectCheckinsInTrendWindow,
  selectNormalizedTrackingCheckins,
  selectPassiveSupportOverview,
  selectTrackingAdherenceContext,
  selectTrackingAnalysisCheckins,
  selectTrackingPhotoComparison,
  trackTrackingCapabilityEvent,
  toTrackingRecommendationProjectionInput,
  type TrackingProjectionCapabilityResult,
} from "@/domains/tracking-intelligence";
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
import TrackingBodyScanSummaryCard from "@/components/tracking-intelligence/TrackingBodyScanSummaryCard";
import TrackingAiBodyFatScanPanel from "@/components/tracking-intelligence/TrackingAiBodyFatScanPanel";
import {
  type CheckinEntry,
  type FoodEntry,
  type MealLogEntry,
  type PassiveHealthSnapshot,
  type WorkoutEntry,
} from "@/services/tracking";
import { fetchAuthMe } from "@/lib/authDedup";
import {
  openAndroidHealthConnectSettings,
  isAndroidHealthSyncAvailable,
  syncAndroidHealthSnapshots,
} from "@/lib/nativeHealthSync";
import TrackingSummaryPreview, {
  type TrackingSummaryRange,
} from "./TrackingSummaryPreview";
import GuidedBodyScanCapture from "./GuidedBodyScanCapture";
import {
  analyzeTrackingBodyFatScan,
  type BodyFatScanExecutionResult,
} from "@/services/trackingBodyFatScan";
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
  view?: "all" | "checkin" | "body-scan";
};

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

// ========== METRIC HELPERS ==========

/**
 * Calculate BMI (Body Mass Index)
 * BMI = weight(kg) / height(m)^2
 */
function calculateBMI(weightKg: number, heightCm: number): number {
  if (!weightKg || !heightCm || heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

/**
 * Get BMI category classification
 */
function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi === 0) return { label: "Sin datos", color: "var(--text-muted)" };
  if (bmi < 18.5) return { label: "Bajo peso", color: "var(--color-warning)" };
  if (bmi < 25) return { label: "Normal", color: "var(--color-success)" };
  if (bmi < 30) return { label: "Sobrepeso", color: "var(--color-warning)" };
  return { label: "Obesidad", color: "var(--color-error)" };
}

/**
 * Calculate BMR using Mifflin-St Jeor equation
 * Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
 * Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
 */
function calculateBMR(weightKg: number, heightCm: number, age: number, sex: "male" | "female"): number {
  if (!weightKg || !heightCm || !age) return 0;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * TDEE = BMR × Activity Multiplier
 */
function calculateTDEE(bmr: number, activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active"): number {
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return Math.round(bmr * multipliers[activityLevel]);
}

/**
 * Get workout frequency score (sessions per week)
 */
function calculateWorkoutFrequency(workouts: Array<{ date: string }>, daysWindow = 7): number {
  const now = new Date();
  const start = new Date(now.getTime() - daysWindow * 24 * 60 * 60 * 1000);
  const count = workouts.filter(w => {
    const d = new Date(w.date);
    return d >= start && d <= now;
  }).length;
  return Math.round((count / daysWindow) * 7); // normalize to per week
}

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
  const isBodyScanOnly = view === "body-scan";
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
  const [checkinBackPhotoUrl, setCheckinBackPhotoUrl] = useState<string | null>(null);
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
  const [progressRange, setProgressRange] = useState<TrackingSummaryRange>("30");
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
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);
  const [isAndroidSyncing, setIsAndroidSyncing] = useState(false);
  const [isAdvancedAnalysisOpen, setIsAdvancedAnalysisOpen] = useState(false);
  const [isPassiveDetailsOpen, setIsPassiveDetailsOpen] = useState(false);
  const [isIntelligencePreviewOpen, setIsIntelligencePreviewOpen] = useState(false);
  const [projectionCapability, setProjectionCapability] =
    useState<TrackingProjectionCapabilityResult | null>(null);
  const [projectionCapabilityStatus, setProjectionCapabilityStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [recommendationAiStatus, setRecommendationAiStatus] = useState<{
    state: "idle" | "loading" | "success" | "blocked" | "error";
    message: string | null;
  }>({ state: "idle", message: null });
  const [bodyFatScanRunState, setBodyFatScanRunState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [bodyFatScanRunError, setBodyFatScanRunError] = useState<string | null>(
    null,
  );
  const [bodyFatScanResult, setBodyFatScanResult] =
    useState<BodyFatScanExecutionResult | null>(null);
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
  const intelligenceComputedRef = useRef(new Set<string>());

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
    if (!isIntelligencePreviewOpen || projectionCapabilityStatus === "loading") {
      return;
    }
    if (projectionCapability && projectionCapability.status !== "error") {
      return;
    }

    let active = true;
    const loadProjectionPreview = async () => {
      setProjectionCapabilityStatus("loading");
      const nextCapability = await loadTrackingProjectionCapability(
        isCheckinOnly ? "checkin_page" : "tracking",
      );
      if (!active) return;
      setProjectionCapability(nextCapability);
      trackTrackingCapabilityEvent({
        event: nextCapability.status === "ready" ? "computed" : "fallback",
        capabilityId: "projection",
        origin: isCheckinOnly ? "checkin_page" : "tracking",
        status: nextCapability.status,
        fallbackLabel: nextCapability.explainability.fallbackLabel,
      });
      setProjectionCapabilityStatus(
        nextCapability.status === "ready" ? "ready" : "error",
      );
    };

    void loadProjectionPreview();

    return () => {
      active = false;
    };
  }, [
    isCheckinOnly,
    isIntelligencePreviewOpen,
    projectionCapability,
    projectionCapabilityStatus,
  ]);

  useEffect(() => {
    localStorage.setItem(CHECKIN_MODE_KEY, checkinMode);
  }, [checkinMode]);

  useEffect(() => {
    setIsAndroidDevice(isAndroidHealthSyncAvailable());
  }, []);

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
    side: "front" | "side" | "back",
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
      } else if (side === "side") {
        setCheckinSidePhotoUrl(compressed);
      } else {
        setCheckinBackPhotoUrl(compressed);
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
      backPhotoUrl:
        checkinMode === "full" && supportsCheckinPhotos
          ? checkinBackPhotoUrl
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
      setCheckinBackPhotoUrl(null);
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

  function mergePassiveSnapshots(
    current: PassiveHealthSnapshot[],
    incoming: PassiveHealthSnapshot[],
  ): PassiveHealthSnapshot[] {
    const map = new Map<string, PassiveHealthSnapshot>();

    [...current, ...incoming].forEach((entry) => {
      const idKey = `${entry.source}:${entry.id}`;
      const fallbackKey = `${entry.source}:${entry.date}:${entry.provider ?? ""}`;
      map.set(entry.id ? idKey : fallbackKey, entry);
    });

    return Array.from(map.values())
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.syncedAt ?? "").localeCompare(a.syncedAt ?? "");
      })
      .slice(0, 180);
  }

  async function syncPassiveFromAndroidDevice() {
    if (isAndroidSyncing) return;

    setIsAndroidSyncing(true);
    showMessage(t("tracking.syncAndroidStarting"));

    try {
      const result = await syncAndroidHealthSnapshots(30);

      if (result.status === "unsupported") {
        if (result.reason === "HEALTH_CONNECT_PROVIDER_UPDATE_REQUIRED") {
          const opened = await openAndroidHealthConnectSettings();
          showMessage(
            opened
              ? t("tracking.syncAndroidUpdateOpened")
              : t("tracking.syncAndroidUpdateRequired"),
          );
          return;
        }

        showMessage(t("tracking.syncAndroidUnavailable"));
        return;
      }

      if (result.status === "permissions") {
        showMessage(t("tracking.syncAndroidPermissionsRequired"));
        return;
      }

      if (result.status === "error") {
        showMessage(t("tracking.syncAndroidError", { reason: result.reason }));
        return;
      }

      if (!result.snapshots.length) {
        showMessage(t("tracking.syncAndroidNoRecentData"));
        return;
      }

      await replacePassiveSync(
        mergePassiveSnapshots(passiveData.snapshots, result.snapshots),
      );
      showMessage(
        t("tracking.syncAndroidSuccess", {
          days: result.snapshots.length,
        }),
      );
    } finally {
      setIsAndroidSyncing(false);
    }
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
    window.setTimeout(() => setActionMessage(null), 3500);
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

  const normalizedCheckins = useMemo(
    () => selectNormalizedTrackingCheckins(checkins, profile),
    [checkins, profile],
  );
  const rangeConfig = useMemo(
    () => getTrackingRangeConfig(Number(progressRange)),
    [progressRange],
  );

  const checkinsInRange = useMemo(() => {
    return selectCheckinsInTrendWindow(normalizedCheckins, rangeConfig.days);
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
    () => buildTrackingProfileSnapshotFallback(profile),
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
  const photoComparison = useMemo(
    () => selectTrackingPhotoComparison(sortedCheckins),
    [sortedCheckins],
  );
  const currentCheckinPhoto = photoComparison.current;
  const baselineCheckinPhoto = photoComparison.baseline;
  const adherenceContext = useMemo(
    () =>
      selectTrackingAdherenceContext({
        checkins,
        mealLog,
        workoutLog,
        passiveData,
        profile,
        rangeDays: Number(progressRange),
      }),
    [checkins, mealLog, workoutLog, passiveData, profile, progressRange],
  );
  const professionalInsights = adherenceContext.professionalInsights;
  const capabilityOrigin = isCheckinOnly ? "checkin_page" : "tracking";
  const bodyScanCapability = useMemo(
    () =>
      buildTrackingBodyScanCapability({
        origin: capabilityOrigin,
        profile,
        checkins,
        passiveData,
        rangeDays: Number(progressRange),
      }),
    [capabilityOrigin, checkins, passiveData, profile, progressRange],
  );
  const estimatedBodyFatScanTokens = useMemo(
    () =>
      estimateTrackingBodyScanTokens({
        origin: capabilityOrigin,
        profile,
        checkins,
        passiveData,
        rangeDays: Number(progressRange),
      }),
    [capabilityOrigin, checkins, passiveData, profile, progressRange],
  );
  const recommendationProjectionInput = useMemo(
    () => toTrackingRecommendationProjectionInput(projectionCapability),
    [projectionCapability],
  );
  const recommendationCapability = useMemo(
    () =>
      buildTrackingRecommendationCapability({
        origin: capabilityOrigin,
        profile,
        adherenceContext,
        bodyScan: bodyScanCapability,
        projection: recommendationProjectionInput,
      }),
    [
      adherenceContext,
      bodyScanCapability,
      capabilityOrigin,
      profile,
      recommendationProjectionInput,
    ],
  );
  useEffect(() => {
    const origin = capabilityOrigin;
    const bodyScanKey = `body-scan:${origin}:${bodyScanCapability.status}:${bodyScanCapability.analysisMode}:${bodyScanCapability.confidence}`;
    const recommendationKey = `recommendation:${origin}:${recommendationCapability.status}:${recommendationCapability.analysisMode}:${recommendationCapability.items.length}`;

    if (!intelligenceComputedRef.current.has(bodyScanKey)) {
      intelligenceComputedRef.current.add(bodyScanKey);
      trackTrackingCapabilityEvent({
        event: "computed",
        capabilityId: "body-scan",
        origin,
        status: bodyScanCapability.status,
        analysisMode: bodyScanCapability.analysisMode,
        confidence: bodyScanCapability.confidence,
      });
    }

    if (!intelligenceComputedRef.current.has(recommendationKey)) {
      intelligenceComputedRef.current.add(recommendationKey);
      trackTrackingCapabilityEvent({
        event: "computed",
        capabilityId: "recommendation",
        origin,
        status: recommendationCapability.status,
        analysisMode: recommendationCapability.analysisMode,
      });
      if (recommendationCapability.explainability.fallbackLabel) {
        trackTrackingCapabilityEvent({
          event: "fallback",
          capabilityId: "recommendation",
          origin,
          status: recommendationCapability.status,
          fallbackLabel: recommendationCapability.explainability.fallbackLabel,
        });
      }
    }
  }, [
    capabilityOrigin,
    bodyScanCapability.analysisMode,
    bodyScanCapability.confidence,
    bodyScanCapability.status,
    recommendationCapability.analysisMode,
    recommendationCapability.explainability.fallbackLabel,
    recommendationCapability.items.length,
    recommendationCapability.status,
  ]);

  useEffect(() => {
    if (!isIntelligencePreviewOpen) return;
    const origin = capabilityOrigin;
    trackTrackingCapabilityEvent({
      event: "viewed",
      capabilityId: "body-scan",
      origin,
      status: bodyScanCapability.status,
      analysisMode: bodyScanCapability.analysisMode,
      confidence: bodyScanCapability.confidence,
    });
    trackTrackingCapabilityEvent({
      event: "viewed",
      capabilityId: "recommendation",
      origin,
      status: recommendationCapability.status,
      analysisMode: recommendationCapability.analysisMode,
    });
  }, [
    capabilityOrigin,
    bodyScanCapability.analysisMode,
    bodyScanCapability.confidence,
    bodyScanCapability.status,
    isIntelligencePreviewOpen,
    recommendationCapability.analysisMode,
    recommendationCapability.status,
  ]);
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
  const passiveOverview = useMemo(
    () =>
      selectPassiveSupportOverview(
        passiveData,
        rangeDays,
        Number(profile.trainingPreferences.daysPerWeek ?? 0),
      ),
    [
      passiveData,
      rangeDays,
      profile.trainingPreferences.daysPerWeek,
    ],
  );
  const passiveRangeEnd = adherenceContext.trendWindow.endDate;
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
  const summaryKpis = useMemo(
    () => [
      {
        id: "weight",
        label: t("tracking.latestWeightTitle"),
        value: rangeLatestCheckin
          ? `${rangeLatestCheckin.weightKg.toFixed(1)} ${t("units.kilograms")}`
          : "—",
        detail: latestCheckin
          ? formatEntryDate(latestCheckin.date)
          : t("tracking.latestWeightEmpty"),
      },
      {
        id: "delta",
        label: t("tracking.weightHistoryTitle"),
        value:
          rangeWeightDelta === null
            ? "—"
            : `${rangeWeightDelta > 0 ? "+" : ""}${rangeWeightDelta.toFixed(1)} ${t("units.kilograms")}`,
        detail: t("tracking.summaryRangeDetail", { days: rangeDays }),
      },
      {
        id: "nutrition",
        label: t("tracking.progressComplianceTitle"),
        value: `${nutritionLoggingAdherence}%`,
        detail: `${nutritionDaysLogged}/${rangeDays} ${t("tracking.progressDaysLogged").toLowerCase()}`,
      },
      {
        id: "training",
        label: t("tracking.progressSessions"),
        value: String(trainingSessions),
        detail: `${trainingMinutes} min`,
      },
    ],
    [
      formatEntryDate,
      latestCheckin,
      nutritionDaysLogged,
      nutritionLoggingAdherence,
      rangeDays,
      rangeLatestCheckin,
      rangeWeightDelta,
      t,
      trainingMinutes,
      trainingSessions,
    ],
  );
  const primaryInsight = useMemo(() => {
    if (progressInsightTab === "nutrition") {
      if (nutritionDaysLogged === 0) {
        return {
          title: t("tracking.progressTabNutrition"),
          chip: t("tracking.progressComplianceTitle"),
          body: t("tracking.mealEmpty"),
        };
      }

      if (
        nutritionProteinTargetAdherence !== null &&
        nutritionProteinTargetAdherence < 70
      ) {
        return {
          title: t("tracking.progressTabNutrition"),
          chip: `${nutritionProteinTargetAdherence}% ${t("tracking.progressProteinTargetLabel").toLowerCase()}`,
          body: t("tracking.primaryInsightNutritionProtein"),
        };
      }

      return {
        title: t("tracking.progressTabNutrition"),
        chip: `${nutritionLoggingAdherence}% ${t("tracking.progressLoggingLabel").toLowerCase()}`,
        body: t("tracking.primaryInsightNutritionLogging"),
      };
    }

    if (progressInsightTab === "training") {
      if (trainingSessions === 0) {
        return {
          title: t("tracking.progressTabTraining"),
          chip: t("tracking.progressSessionTarget"),
          body: t("tracking.workoutEmpty"),
        };
      }

      return {
        title: t("tracking.progressTabTraining"),
        chip: `${trainingConsistency}% ${t("tracking.progressConsistency").toLowerCase()}`,
        body:
          trainingSessions >= targetSessions
            ? t("tracking.primaryInsightTrainingOnTrack")
            : t("tracking.primaryInsightTrainingCatchUp", {
                remaining: Math.max(0, targetSessions - trainingSessions),
              }),
      };
    }

    const topAlert = professionalInsights.alerts[0];
    if (topAlert) {
      return {
        title: t("tracking.progressTabCheckin"),
        chip: t("tracking.primaryInsightCoachChip"),
        body: topAlert.detail,
      };
    }

    return {
      title: t("tracking.progressTabCheckin"),
      chip: `${professionalInsights.combinedAdherencePct}% ${t("tracking.progressConsistency").toLowerCase()}`,
      body: latestCheckin
        ? buildRecommendation(latestCheckin.weightKg)
        : t("tracking.latestWeightEmpty"),
    };
  }, [
    latestCheckin,
    nutritionDaysLogged,
    nutritionLoggingAdherence,
    nutritionProteinTargetAdherence,
    professionalInsights.alerts,
    professionalInsights.combinedAdherencePct,
    progressInsightTab,
    t,
    targetSessions,
    trainingConsistency,
    trainingSessions,
  ]);

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

  async function handleApplyRecommendationAiPlan(
    item: (typeof recommendationCapability.items)[number],
  ) {
    if (item.cta.target !== "training-plan") return;
    setRecommendationAiStatus({ state: "loading", message: null });

    const trainingPreferences = getTrainingAdjustmentInput(profile);
    const auth = await fetchAuthMe().catch(() => null);
    const result = await consumeTrackingRecommendationForAiPlan({
      recommendation: item,
      profile,
      trainingPreferences,
      aiProfile: auth,
    });

    if (!result.ok) {
      setRecommendationAiStatus({
        state: result.status === "blocked" ? "blocked" : "error",
        message: result.message,
      });
      if (result.status === "blocked") {
        trackTrackingCapabilityEvent({
          event: "ai_preflight_blocked",
          capabilityId: "recommendation",
          origin: isCheckinOnly ? "checkin_page" : "tracking",
          status: recommendationCapability.status,
          analysisMode: recommendationCapability.analysisMode,
        });
      }
      return;
    }

    setRecommendationAiStatus({
      state: "success",
      message: "Plan de entrenamiento AI aplicado desde recommendation.",
    });
    trackTrackingCapabilityEvent({
      event: "cta_clicked",
      capabilityId: "recommendation",
      origin: isCheckinOnly ? "checkin_page" : "tracking",
      status: recommendationCapability.status,
      ctaTarget: "training-plan-ai-consumer",
    });
  }

  async function handleAnalyzeBodyFatScan() {
    if (!latestCheckin?.frontPhotoUrl || !latestCheckin?.sidePhotoUrl) {
      setBodyFatScanRunError("Necesitas fotos frontal y lateral en tu último check-in");
      return;
    }
    setBodyFatScanRunState("loading");
    setBodyFatScanRunError(null);
    const result = await analyzeTrackingBodyFatScan({
      frontPhotoDataUrl: latestCheckin.frontPhotoUrl,
      sidePhotoDataUrl: latestCheckin.sidePhotoUrl,
      dorsalPhotoDataUrl: latestCheckin.backPhotoUrl ?? undefined,
      locale: "es",
    });
    setBodyFatScanRunState(result.ok ? "success" : "error");
    if (result.ok && result.data) {
      setBodyFatScanResult(result.data);
    } else {
      setBodyFatScanRunError("Error al ejecutar el scan");
    }
  }

  function resetBodyFatScan() {
    setBodyFatScanRunState("idle");
    setBodyFatScanRunError(null);
    setBodyFatScanResult(null);
  }

const primaryRecommendation = recommendationCapability.items[0] ?? null;
  const bodyScanComposition = bodyScanCapability.data.composition;

  const weeklyReviewReady = trainingConsistency >= 70 || trainingSessions > 0;
  const weeklyReviewReason = weeklyReviewReady
    ? "Tienes datos suficientes para una revisión significativa"
    : "Completa al menos una sesión para generar insights";

  // ========== CALCULATED METRICS ==========
  const currentWeight = Number(latestCheckin?.weightKg ?? profile.weightKg ?? 0);
  const currentHeight = Number(profile.heightCm ?? 0);
  const profileAge = Number(profile.age ?? 0);
  const profileSex = (profile.sex ?? "male") === "male" ? "male" : "female";
  const activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active" = 
    profile.activity === "sedentary" ? "sedentary" :
    profile.activity === "light" ? "light" :
    profile.activity === "moderate" ? "moderate" :
    profile.activity === "very" ? "very_active" :
    profile.activity === "extra" ? "very_active" : "moderate";

  const bmi = calculateBMI(currentWeight, currentHeight);
  const bmiCategory = getBMICategory(bmi);
  const bmr = calculateBMR(currentWeight, currentHeight, profileAge, profileSex);
  const tdee = calculateTDEE(bmr, activityLevel);
  const workoutFrequency = calculateWorkoutFrequency(workoutsSorted.map(w => ({ date: w.date })));
  const bodyFatPct = latestCheckin?.bodyFatPercent ?? null;

  // ========== UI DATA ==========
  const actionQueueItems = [
    { id: "checkin", label: "Check-in", subtitle: latestCheckin ? `Último: ${latestCheckin.weightKg.toFixed(1)}kg` : "Registra tu peso", cta: "Hacer check-in", href: "/app/seguimiento/check-in", completed: !!latestCheckin },
    { id: "body-scan", label: "Body scan", subtitle: bodyScanCapability.status === "ready" ? bodyScanCapability.summary : "Análisis corporal", cta: "Ver scan", href: "/app/body-scan", completed: bodyScanCapability.status === "ready" },
    { id: "weekly-review", label: "Revisión semanal", subtitle: weeklyReviewReason, cta: "Ver resumen", href: "/app/weekly-review", completed: false },
  ];

  // KPIs centrados en métricas - NO acciones
  const metricCards = [
    { id: "weight", label: "Peso", value: currentWeight > 0 ? `${currentWeight.toFixed(1)} kg` : "—", sub: latestCheckin ? formatEntryDate(latestCheckin.date).slice(0,5) : "Sin datos", icon: "⚖️" },
    { id: "bmi", label: "IMC", value: bmi > 0 ? String(bmi) : "—", sub: bmiCategory.label, color: bmiCategory.color, icon: "📊" },
    { id: "bodyfat", label: "Grasa %", value: bodyFatPct ? `${bodyFatPct.toFixed(1)}%` : "—", sub: bodyFatPct ? "body scan" : "Sin datos", icon: "🔥" },
    { id: "bmr", label: "BMR", value: bmr > 0 ? `${bmr} kcal` : "—", sub: "base diario", icon: "⚡" },
    { id: "tdee", label: "TDEE", value: tdee > 0 ? `${tdee} kcal` : "—", sub: activityLevel, icon: "🔥" },
    { id: "workouts", label: "Frecuencia", value: `${workoutFrequency}/sem`, sub: `${trainingSessions} sesiones`, icon: "🏋️" },
  ];

  const weekKpiItems = [
    { id: "weight", label: "Peso actual", value: rangeLatestCheckin ? `${rangeLatestCheckin.weightKg.toFixed(1)} kg` : "—", detail: latestCheckin ? formatEntryDate(latestCheckin.date) : "Sin datos" },
    { id: "delta", label: "Cambio semanal", value: rangeWeightDelta !== null ? `${rangeWeightDelta > 0 ? "+" : ""}${rangeWeightDelta.toFixed(1)} kg` : "—", detail: rangeDays <= 7 ? "esta semana" : `últimos ${rangeDays} días` },
    { id: "nutrition", label: "Nutrición", value: `${nutritionLoggingAdherence}%`, detail: `${nutritionDaysLogged}/${rangeDays} días` },
    { id: "training", label: "Sesiones", value: String(trainingSessions), detail: `${trainingMinutes} min` },
  ];

  const insightFacts = progressInsightTab === "checkin"
    ? [
        latestCheckin ? `${latestCheckin.weightKg.toFixed(1)} kg` : "Sin datos",
        rangeWeightDelta !== null ? `${rangeWeightDelta > 0 ? "+" : ""}${rangeWeightDelta.toFixed(1)} kg` : "Sin historial",
        `${rangeCheckinConsistency}% consistencia`,
      ]
    : progressInsightTab === "nutrition"
      ? [
          `${nutritionDaysLogged}/${rangeDays} días registrados`,
          nutritionDaysLogged > 0 ? `${nutritionAverages.calories.toFixed(0)} kcal/día` : "Sin datos",
          `${nutritionLoggingAdherence}% adherence`,
        ]
      : [
          `${trainingSessions} sesiones`,
          `${trainingMinutes} minutos`,
          `${trainingConsistency}% meta semanal`,
        ];

  return (
    <div
      className={
        isCheckinOnly
          ? `${styles.checkinOnlyBody} nutrition-page-shell`
          : isBodyScanOnly
            ? styles.trackingPageContent
            : styles.trackingPageContent
      }
      data-testid="tracking-page"
    >
      {isBodyScanOnly ? (
        <section className={styles.bodyScanReportShell}>
          {hasAdjustmentEntitlement ? <TrackingBodyScanSummaryCard capability={bodyScanCapability} /> : null}

          {!hasAdjustmentEntitlement ? (
            <div className="rounded-3xl border border-[rgba(245,158,11,0.3)] bg-[rgba(255,247,237,0.9)] p-5 shadow-sm">
              <p className="m-0 text-sm font-semibold text-[var(--text)]">Body Scan Avanzado</p>
              <p className="m-0 mt-2 text-sm leading-6 text-[var(--text)]">Desbloquea análisis corporal avanzado y recomendaciones personalizadas con Pro.</p>
              <div className="mt-3">
                <Link href="/app/settings/billing" className="btn primary fit-content">Desbloquea con Pro</Link>
              </div>
            </div>
          ) : null}

          <div className={styles.bodyScanActionRow}>
            <Link href="/app/body-scan" className="btn primary fit-content">Abrir scan completo</Link>
            <Link href="/app/seguimiento/check-in" className="btn secondary fit-content">Actualizar fotos</Link>
          </div>

          <section className={styles.bodyScanPlanCard}>
            <div>
              <p className="eyebrow m-0">Plan recomendado</p>
              <h3 className="section-title section-title-sm m-0">{recommendationCapability.summary}</h3>
              {primaryRecommendation ? (
                <p className="muted m-0">{primaryRecommendation.title}</p>
              ) : null}
            </div>
            {primaryRecommendation ? (
              <Link
                href={primaryRecommendation.cta.href}
                className="btn secondary fit-content"
                onClick={() =>
                  trackTrackingCapabilityEvent({
                    event: "cta_clicked",
                    capabilityId: "recommendation",
                    origin: isCheckinOnly ? "checkin_page" : "tracking",
                    status: recommendationCapability.status,
                    ctaTarget: primaryRecommendation.cta.target,
                  })
                }
              >
                {primaryRecommendation.cta.label}
              </Link>
            ) : null}
          </section>

          <details className={styles.advancedDisclosure}>
            <summary>
              <div className={styles.advancedDisclosureTitle}>
                <strong>Analisis avanzado</strong>
                <span className="muted">Contexto del resultado, metodologia y escaneo IA completo.</span>
              </div>
              <span className={styles.advancedDisclosureIndicator}>Ver</span>
            </summary>
            <div className={styles.advancedDisclosureBody}>
              <p className="m-0 text-sm leading-6 text-[var(--text)]">{bodyScanCapability.summary}</p>
              {bodyScanCapability.observations.length > 0 ? (
                <ul className={styles.bodyScanDetailList}>
                  {bodyScanCapability.observations.slice(0, 2).map((item, index) => (
                    <li key={`body-scan-observation-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {bodyScanComposition ? (
                <>
                  <p className="m-0 text-sm leading-6 text-[var(--text)]">{bodyScanComposition.accuracyNote}</p>
                  <div className={styles.bodyScanSourceList}>
                    {bodyScanComposition.sources.map((source) => (
                      <span key={source}>
                        {source === "manual_body_fat"
                          ? "Grasa corporal manual"
                          : source === "us_navy"
                            ? "Medidas corporales"
                            : "Perfil base"}
                      </span>
                    ))}
                  </div>
                </>
              ) : null}
              {bodyScanCapability.nextBestInputs.length > 1 ? (
                <ul className={styles.bodyScanDetailList}>
                  {bodyScanCapability.nextBestInputs.slice(1).map((item, index) => (
                    <li key={`body-scan-input-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : null}
              <p className="m-0 text-xs leading-5 text-[var(--muted)]">{bodyScanCapability.compliance.disclaimer}</p>
              <TrackingAiBodyFatScanPanel
                capability={{
                  state: bodyScanCapability.state,
                  nextBestInputs: bodyScanCapability.nextBestInputs,
                  compliance: bodyScanCapability.compliance,
                }}
                estimatedTokens={estimatedBodyFatScanTokens}
                tokenBalance={adjustmentTokenBalance}
                isProEligible={hasAdjustmentEntitlement}
                isLoading={bodyFatScanRunState === "loading"}
                errorMessage={bodyFatScanRunError}
                result={bodyFatScanResult}
                onAnalyze={() => void handleAnalyzeBodyFatScan()}
                onRetry={resetBodyFatScan}
                t={t}
                openHref="/app/body-scan"
              />
            </div>
          </details>

          <details className={styles.advancedDisclosure}>
            <summary>
              <div className={styles.advancedDisclosureTitle}>
                <strong>Recomendación completa / detalles del plan</strong>
                <span className="muted">Racional, notas de modelo y acciones disponibles.</span>
              </div>
              <span className={styles.advancedDisclosureIndicator}>Ver</span>
            </summary>
            <div className={styles.advancedDisclosureBody}>
              {projectionCapabilityStatus === "loading" ? (
                <LoadingState
                  ariaLabel="Cargando recomendacion"
                  showCard={false}
                  variant="inline"
                  lines={2}
                />
              ) : (
                <p className="m-0 text-sm leading-6 text-[var(--text)]">{recommendationCapability.explainability.summary}</p>
              )}
              <div className={styles.bodyScanRecommendationList}>
                {recommendationCapability.items.map((item) => (
                  <article key={item.id} className={styles.bodyScanRecommendationItem}>
                    <div className={styles.bodyScanRecommendationHeader}>
                      <div>
                        <h4 className="m-0 text-base font-semibold text-[var(--text)]">{item.title}</h4>
                        <p className="m-0 mt-2 text-sm leading-6 text-[var(--text)]">{item.summary}</p>
                      </div>
                      <span>{item.confidence}</span>
                    </div>
                    {item.rationale.length > 0 ? (
                      <ul className={styles.bodyScanDetailList}>
                        {item.rationale.map((rationale, index) => (
                          <li key={`${item.id}-rationale-${index}`}>{rationale}</li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="inline-actions-sm">
                      <Link
                        href={item.cta.href}
                        className="btn secondary fit-content"
                        onClick={() =>
                          trackTrackingCapabilityEvent({
                            event: "cta_clicked",
                            capabilityId: "recommendation",
                            origin: isCheckinOnly ? "checkin_page" : "tracking",
                            status: recommendationCapability.status,
                            ctaTarget: item.cta.target,
                          })
                        }
                      >
                        {item.cta.label}
                      </Link>
                      {item.cta.target === "training-plan" ? (
                        <button
                          type="button"
                          className="btn"
                          disabled={recommendationAiStatus.state === "loading"}
                          onClick={() => void handleApplyRecommendationAiPlan(item)}
                        >
                          {recommendationAiStatus.state === "loading" ? "Aplicando plan IA..." : "Aplicar plan IA"}
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
              {recommendationCapability.explainability.rationale.length > 0 ? (
                <div className={styles.bodyScanMutedStack}>
                  {recommendationCapability.explainability.rationale.map((item, index) => (
                    <p key={`recommendation-model-${index}`} className="m-0 text-xs leading-5 text-[var(--muted)]">
                      {item}
                    </p>
                  ))}
                </div>
              ) : null}
              {recommendationCapability.explainability.fallbackLabel ? (
                <p className="m-0 text-xs text-[var(--muted)]">Fallback activo: {recommendationCapability.explainability.fallbackLabel}</p>
              ) : null}
              <p className="m-0 text-xs text-[var(--muted)]">{recommendationCapability.compliance.disclaimer}</p>
              {recommendationAiStatus.message ? (
                <p className="m-0 text-xs text-[var(--muted)]">{recommendationAiStatus.message}</p>
              ) : null}
            </div>
          </details>
        </section>
      ) : null}

      {isBodyScanOnly ? null : (
        <>
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
        // METRICS GRID - KPIs first (centered in insights)
        <section className={styles.metricsGrid} aria-label="Tu salud de un vistazo">
          {metricCards.map((m) => (
            <article key={m.id} className={styles.metricCard}>
              <span className={styles.metricCardIcon}>{m.icon}</span>
              <strong className={styles.metricCardValue} style={{ color: m.color }}>{m.value}</strong>
              <span className={styles.metricCardLabel}>{m.label}</span>
              <span className={styles.metricCardSub}>{m.sub}</span>
            </article>
          ))}
        </section>
      ) : null}

      {!isCheckinOnly ? (
        <section className={`card premium-surface-card surface-content-card ${styles.heroCard} ${styles.quickCheckinHero}`}>
          <div className={styles.dailyHero}>
            <p className="eyebrow m-0">{t("tracking.pageEyebrow")}</p>
            <h1 className="section-title m-0" style={{ fontSize: "1.5rem" }}>
              {latestCheckin
                ? `Último peso: ${latestCheckin.weightKg.toFixed(1)} kg`
                : "Sin registros aún"}
            </h1>
            <p className="muted m-0">{t("tracking.pageSubtitle")}</p>
          </div>
          <button
            type="button"
            className={`btn primary ${styles.heroPrimaryAction}`}
            onClick={() => router.push("/app/seguimiento/check-in")}
          >
            {t("today.checkinPrimaryCta")}
          </button>
        </section>
      ) : null}

      {!isCheckinOnly ? (
        // ACTION QUEUE - moves to bottom (secondary priority)
        <section className={styles.actionQueue} aria-label="Acciones rápidas">
          {actionQueueItems.slice(0, 3).map((item) => (
            <article key={item.id} className={styles.actionQueueCard}>
              <div className={styles.actionQueueHeader}>
                <span className={`${styles.actionQueueStatus} ${item.completed ? styles.actionQueueCompleted : ""}`} />
                <strong>{item.label}</strong>
              </div>
              <p className="muted m-0">{item.subtitle}</p>
              <Link href={item.href} className="btn secondary fit-content">
                {item.cta}
              </Link>
            </article>
          ))}
        </section>
      ) : null}

      {/* WEEKLY KPI - removed as it's now in metricCards above */}
      {/* {!isCheckinOnly ? (
        <section className={styles.weekKpiGrid} aria-label="Resumen de la semana">
          {weekKpiItems.map((item) => (
            <article key={item.id} className={styles.weekKpiCard}>
              <p className="muted m-0">{item.label}</p>
              <strong className={styles.weekKpiValue}>{item.value}</strong>
              <span className="muted">{item.detail}</span>
            </article>
          ))}
        </section>
      ) : null} */}

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

          <div className={styles.insightCompactContent}>
            {progressInsightTab === "checkin" ? (
              <div className={styles.chartWrap}>
                {checkinTrendData.length < 2 ? (
                  <p className="muted">{t("tracking.weeklyProgressEmpty")}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart
                      data={checkinTrendData}
                      margin={{ top: 8, right: 4, left: -14, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="tracking-weight-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.36} />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="color-mix(in srgb, var(--border) 65%, transparent)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} width={38} domain={["dataMin - 0.6", "dataMax + 0.6"]} />
                      <Tooltip
                        formatter={(value) => [`${Number(value ?? 0).toFixed(1)} ${t("units.kilograms")}`, t("tracking.latestWeightTitle")]}
                        labelFormatter={(label) => String(label)}
                        contentStyle={{ borderRadius: 12, border: "1px solid color-mix(in srgb, var(--border) 85%, transparent)", background: "var(--bg-card)" }}
                      />
                      <Area type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2.25} fill="url(#tracking-weight-area)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            ) : null}

            {progressInsightTab === "nutrition" ? (
              <div className={styles.chartWrap}>
                {nutritionTrendData.length === 0 ? (
                  <p className="muted">{t("tracking.mealEmpty")}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={nutritionTrendData} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
                      <CartesianGrid stroke="color-mix(in srgb, var(--border) 65%, transparent)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} width={38} />
                      <Tooltip
                        formatter={(value) => [`${Math.round(Number(value ?? 0))} ${t("units.kcal")}`, t("tracking.progressAverageCalories")]}
                        labelFormatter={(label) => String(label)}
                        contentStyle={{ borderRadius: 12, border: "1px solid color-mix(in srgb, var(--border) 85%, transparent)", background: "var(--bg-card)" }}
                      />
                      <Bar dataKey="calories" radius={[8, 8, 0, 0]} fill="var(--accent)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            ) : null}

            {progressInsightTab === "training" ? (
              <div className={styles.chartWrap}>
                {trainingTrendData.length === 0 ? (
                  <p className="muted">{t("tracking.workoutEmpty")}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={trainingTrendData} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
                      <CartesianGrid stroke="color-mix(in srgb, var(--border) 65%, transparent)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} width={32} allowDecimals={false} />
                      <Tooltip
                        formatter={(value, key) => [key === "sessions" ? `${value} sesiones` : `${value} min`, key === "sessions" ? "Sesiones" : "Minutos"]}
                        labelFormatter={(label) => String(label)}
                        contentStyle={{ borderRadius: 12, border: "1px solid color-mix(in srgb, var(--border) 85%, transparent)", background: "var(--bg-card)" }}
                      />
                      <Bar dataKey="sessions" radius={[8, 8, 0, 0]} fill="var(--accent)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            ) : null}

            <div className={styles.insightFacts}>
              {insightFacts.map((fact, index) => (
                <span key={index} className={styles.insightFact}>{fact}</span>
              ))}
            </div>

            <div className={styles.insightSentence}>
              <p className="m-0">{primaryInsight.body}</p>
            </div>
          </div>
        </section>
) : null}

      {!isCheckinOnly ? (
        <section className={styles.bodyScanPreview} aria-label="Resumen corporal">
          <div className={styles.bodyScanPreviewHeader}>
            <div>
              <p className="eyebrow m-0">Resumen corporal</p>
              <h3 className="section-title section-title-sm m-0">{bodyScanCapability.summary}</h3>
            </div>
            <span className={styles.bodyScanConfidence}>{bodyScanCapability.confidence}</span>
          </div>
          <p className="muted m-0">{recommendationCapability.explainability.summary.slice(0, 120)}...</p>
          <div className={styles.bodyScanPreviewCtas}>
            <Link href="/app/body-scan" className="btn secondary fit-content">Ver scan</Link>
            {primaryRecommendation ? (
              <Link href={primaryRecommendation.cta.href} className="btn primary fit-content">
                {primaryRecommendation.cta.label}
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {!isCheckinOnly ? (
        <section className={styles.weeklyReviewHandoff} aria-label="Decisión semanal">
          <div className={styles.weeklyReviewHeader}>
            <p className="eyebrow m-0">Decisión semanal</p>
            <h3 className="section-title section-title-sm m-0">{weeklyReviewReady ? "Listo para revisar" : "Sin suficientes datos"}</h3>
          </div>
          <p className="muted m-0">{weeklyReviewReason}</p>
          <Link href="/app/weekly-review" className="btn primary fit-content">
            Ver resumen semanal
          </Link>
        </section>
      ) : null}

      {!isCheckinOnly ? (
        <section className={styles.advancedSection} aria-label="Análisis avanzado">
          <details
            className={styles.advancedDisclosure}
            onToggle={(event) =>
              setIsAdvancedAnalysisOpen(
                (event.currentTarget as HTMLDetailsElement).open,
              )
            }
          >
            <summary>
              <div className={styles.advancedDisclosureTitle}>
                <strong>Análisis avanzado</strong>
                <span className="muted">Profesional, salud pasiva y modelo IA</span>
              </div>
              <span className={styles.advancedDisclosureIndicator}>
                {isAdvancedAnalysisOpen ? t("ui.showLess") : t("ui.viewAll")}
              </span>
            </summary>
            <div className={styles.advancedDisclosureBody}>
              <TrackingProfessionalInsights insights={professionalInsights} />
              <PassiveHealthSummaryCard
                passiveData={passiveData}
                overview={passiveOverview}
                endDate={passiveRangeEnd}
                onSaveSnapshot={savePassiveSnapshot}
                onLoadDemo={replacePassiveSync}
                onSyncDevice={isAndroidDevice ? syncPassiveFromAndroidDevice : undefined}
                showDeviceSyncCta={isAndroidDevice}
                syncPending={isAndroidSyncing}
                disabled={trackingStatus === "loading"}
              />
              {hasAdjustmentEntitlement && (
                <TrackingBodyScanSummaryCard capability={bodyScanCapability} />
              )}
            </div>
          </details>
        </section>
      ) : null}

      {isCheckinOnly ? (
        <section
          className={`${styles.checkinShell} premium-fade-up`}
          id="weight-entry"
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
                <GuidedBodyScanCapture
                  frontPreviewUrl={checkinFrontPhotoUrl}
                  sidePreviewUrl={checkinSidePhotoUrl}
                  backPreviewUrl={checkinBackPhotoUrl}
                  isProcessing={isCheckinPhotoProcessing}
                  errorMessage={checkinPhotoError}
                  onFrontUpload={(event) => {
                    void handleCheckinPhotoUpload("front", event);
                  }}
                  onSideUpload={(event) => {
                    void handleCheckinPhotoUpload("side", event);
                  }}
                  onBackUpload={(event) => {
                    void handleCheckinPhotoUpload("back", event);
                  }}
                />
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
                      {baselineCheckinPhoto.backPhotoUrl ? (
                        <img
                          src={baselineCheckinPhoto.backPhotoUrl}
                          alt={t("tracking.checkinBackPhotoLabel")}
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
                      {currentCheckinPhoto.backPhotoUrl ? (
                        <img
                          src={currentCheckinPhoto.backPhotoUrl}
                          alt={t("tracking.checkinBackPhotoLabel")}
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
        </>
      )}
    </div>
  );
}
