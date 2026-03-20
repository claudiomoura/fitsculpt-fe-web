"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import type { Locale } from "@/lib/i18n";
import { addDays, differenceInDays, isSameDay, parseDate, toDateKey } from "@/lib/calendar";
import { addWeeks, getWeekOffsetFromCurrent, getWeekStart, projectDaysForWeek } from "@/lib/planProjection";
import {
  type Goal,
  type TrainingEquipment,
  type TrainingFocus,
  type TrainingLevel,
  type SessionTime,
  type TrainingPlanData,
  type ProfileData,
} from "@/lib/profile";
import { getUserProfile, updateUserProfile } from "@/lib/profileService";
import { isProfileComplete } from "@/lib/profileCompletion";
import { Badge } from "@/design-system/components/Badge";
import { Button, ButtonLink } from "@/design-system/components/Button";
import { Icon } from "@/design-system/components/Icon";
import { Modal } from "@/design-system/components/Modal";
import { AiTokensExhaustedModal } from "@/components/ai/AiTokensExhaustedModal";
import { Skeleton } from "@/design-system/components/Skeleton";
import {
  AiPlanRequestError,
  hasStrengthAiEntitlement,
  requestAiTrainingPlan,
  saveAiTrainingPlan,
  type AiEntitlementProfile,
} from "@/domains/ai";
import { AiPlanPreviewModal } from "@/components/training-plan/AiPlanPreviewModal";
import { EmptyState } from "@/components/states";
import { AiModuleUpgradeCTA } from "@/components/UpgradeCTA/AiModuleUpgradeCTA";
import { useToast } from "@/design-system/components/Toast";
import { ErrorBlock } from "@/design-system";
import { ExerciseThumbnail } from "@/components/exercises/ExerciseThumbnail";
import { classifyAiError } from "@/lib/aiErrorMapping";
import { mapAiErrorToUiState, type AiErrorUiState } from "@/lib/aiErrorUi";
import { getExerciseThumbUrl } from "@/lib/exerciseMedia";
import { ExercisePlanDetailModal } from "@/components/exercise-library/detail/ExercisePlanDetailModal";
import { TRAINING_ANALYTICS_TODO } from "./analytics";
import { clampDayKeyToPlanStart, clampDateNotBefore, useTrainingCalendar } from "./hooks/useTrainingCalendar";

type Exercise = {
  id?: string;
  exerciseId?: string;
  imageUrl?: string;
  name: string;
  sets: string | number;
  reps?: string;
  notes?: string;
};

type TrainingDay = {
  date?: string;
  label: string;
  focus: string;
  duration: number;
  exercises: Exercise[];
};

type TrainingPlan = Omit<TrainingPlanData, "days"> & {
  days: TrainingDay[];
};

type TrainingForm = {
  goal: Goal;
  level: TrainingLevel;
  daysPerWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  equipment: TrainingEquipment;
  focus: TrainingFocus;
  sessionTime: SessionTime;
};

type ActiveTrainingPlanResponse = {
  source?: "assigned" | "own";
  plan?: TrainingPlan | null;
};

type ActivePlanOrigin = "selected" | "assigned";

const SELECTED_PLAN_STORAGE_KEY = "fs_selected_plan_id";
const LEGACY_ACTIVE_PLAN_STORAGE_KEY = "fs_active_training_plan_id";
const TRAINING_PLANS_UPDATED_AT_KEY = "fs_training_plans_updated_at";
const AUTO_AI_TRIGGER_GUARD_TTL_MS = 4000;

type TrainingPlanClientProps = {
  mode?: "suggested" | "manual";
};

type AiUsageSummary = {
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  balanceAfter?: number;
};

type AiTokenSnapshot = {
  tokens: number | null;
};

type ExerciseDetailState = {
  exercise: Exercise;
  date: Date;
};

type ExerciseCatalogItem = {
  id: string;
  name?: string | null;
  imageUrl?: string | null;
  posterUrl?: string | null;
  mediaUrl?: string | null;
  videoUrl?: string | null;
};

type WorkoutLookupItem = {
  id: string;
  name?: string | null;
  scheduledAt?: string | null;
  sessions?: Array<{ finishedAt?: string | null }>;
};

type PlanEntry = {
  date: Date;
  day: TrainingDay;
};

async function readAiTokenSnapshot(): Promise<AiTokenSnapshot> {
  try {
    const quotaResponse = await fetch("/api/ai/quota", { cache: "no-store", credentials: "include" });
    if (!quotaResponse.ok) {
      return { tokens: null };
    }
    const quotaData = (await quotaResponse.json()) as {
      tokens?: unknown;
      aiTokenBalance?: unknown;
      remainingTokens?: unknown;
      balance?: unknown;
    };
    const quotaTokens =
      typeof quotaData.tokens === "number"
        ? quotaData.tokens
        : typeof quotaData.aiTokenBalance === "number"
          ? quotaData.aiTokenBalance
          : typeof quotaData.remainingTokens === "number"
            ? quotaData.remainingTokens
            : typeof quotaData.balance === "number"
              ? quotaData.balance
              : null;
    return { tokens: quotaTokens };
  } catch (_err) {
    return { tokens: null };
  }
}

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const baseExercisePool = {
  full: {
    gym: [] as string[],
    home: [] as string[],
  },
  upper: {
    gym: [] as string[],
    home: [] as string[],
  },
  lower: {
    gym: [] as string[],
    home: [] as string[],
  },
  push: {
    gym: [] as string[],
    home: [] as string[],
  },
  pull: {
    gym: [] as string[],
    home: [] as string[],
  },
  legs: {
    gym: [] as string[],
    home: [] as string[],
  },
};

const EXERCISE_POOL = {
  full: {
    gym: ["squat", "benchPress", "barbellRow", "romanianDeadlift", "overheadPress", "plank"],
    home: ["squat", "pushUps", "bandRow", "lunges", "pikePushUps", "plank"],
  },
  upper: {
    gym: ["benchPress", "barbellRow", "overheadPress", "pullUps", "bicepsCurl", "tricepsExtension"],
    home: ["pushUps", "bandRow", "dumbbellOverheadPress", "benchDips", "bicepsCurl", "plank"],
  },
  lower: {
    gym: ["squat", "romanianDeadlift", "legPress", "calfRaise", "hipThrust", "core"],
    home: ["squat", "lunges", "gluteBridge", "calfRaise", "goodMorning", "core"],
  },
  push: {
    gym: ["benchPress", "overheadPress", "inclinePress", "dips", "lateralRaises", "triceps"],
    home: ["pushUps", "dumbbellOverheadPress", "inclineDumbbellPress", "dips", "lateralRaises", "triceps"],
  },
  pull: {
    gym: ["barbellRow", "pullUps", "facePull", "bicepsCurl", "cableRow", "core"],
    home: ["bandRow", "assistedPullUps", "bandFacePull", "bicepsCurl", "invertedRow", "core"],
  },
  legs: {
    gym: ["squat", "romanianDeadlift", "legPress", "hamstringCurl", "calfRaise", "core"],
    home: ["squat", "lunges", "dumbbellRomanianDeadlift", "swissBallLegCurl", "calfRaise", "core"],
  },
} satisfies typeof baseExercisePool;

const DAY_LABEL_KEYS = [
  "training.dayNames.monday",
  "training.dayNames.tuesday",
  "training.dayNames.wednesday",
  "training.dayNames.thursday",
  "training.dayNames.friday",
  "training.dayNames.saturday",
  "training.dayNames.sunday",
] as const;

function durationFromSessionTime(sessionTime: SessionTime) {
  switch (sessionTime) {
    case "short":
      return 35;
    case "medium":
      return 50;
    default:
      return 65;
  }
}

function setsForLevel(level: TrainingLevel, goal: Goal) {
  if (level === "beginner") return goal === "cut" ? "2-3 x 10-12" : "3 x 8-12";
  if (level === "intermediate") return goal === "cut" ? "3 x 10-12" : "3-4 x 8-10";
  return goal === "cut" ? "3-4 x 8-12" : "4 x 6-10";
}

function buildExercises(list: string[], sets: string, maxItems: number, t: (key: string) => string): Exercise[] {
  return list.slice(0, maxItems).map((name) => ({ name: t(`training.exercises.${name}`), sets }));
}

function generatePlan(
  form: TrainingForm,
  locale: Locale,
  t: (key: string) => string
): TrainingPlan {
  const sets = setsForLevel(form.level, form.goal);
  const duration = durationFromSessionTime(form.sessionTime);
  const dayLabels = DAY_LABEL_KEYS.map((key) => t(key));
  const exercisePool = EXERCISE_POOL;
  const days = Array.from({ length: form.daysPerWeek }).map((_, i) => {
    const label = `${dayLabels[i] ?? t("training.dayLabel")} ${i + 1}`;
    const equipmentKey = form.equipment;
    let focusLabel = t("training.focusFullBody");
    let exercises: Exercise[] = [];

    if (form.focus === "upperLower") {
      const isUpper = i % 2 === 0;
      focusLabel = isUpper ? t("training.focusUpper") : t("training.focusLower");
      exercises = buildExercises(
        isUpper ? exercisePool.upper[equipmentKey] : exercisePool.lower[equipmentKey],
        sets,
        6,
        t
      );
    } else if (form.focus === "ppl") {
      const phase = i % 3;
      if (phase === 0) {
        focusLabel = t("training.focusPush");
        exercises = buildExercises(exercisePool.push[equipmentKey], sets, 6, t);
      } else if (phase === 1) {
        focusLabel = t("training.focusPull");
        exercises = buildExercises(exercisePool.pull[equipmentKey], sets, 6, t);
      } else {
        focusLabel = t("training.focusLegs");
        exercises = buildExercises(exercisePool.legs[equipmentKey], sets, 6, t);
      }
    } else {
      focusLabel = t("training.focusFullBody");
      exercises = buildExercises(exercisePool.full[equipmentKey], sets, 6, t);
    }

    return {
      label,
      focus: focusLabel,
      duration,
      exercises,
    };
  });

  return { days };
}

function createEmptyPlan(daysPerWeek: number, _locale: Locale, t: (key: string) => string): TrainingPlan {
  const dayLabels = DAY_LABEL_KEYS.map((key) => t(key));
  return {
    days: Array.from({ length: daysPerWeek }).map((_, index) => ({
      label: dayLabels[index] ?? `${t("training.dayLabel")} ${index + 1}`,
      focus: t("training.focusFullBody"),
      duration: 45,
      exercises: [],
    })),
  };
}

function shouldTriggerAiGeneration(aiQueryParam: string | null): boolean {
  if (!aiQueryParam) return false;
  const normalized = aiQueryParam.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

const periodization = [
  { label: "weekBase", detailKey: "weekBaseDesc", setsDelta: 0 },
  { label: "weekBuild", detailKey: "weekBuildDesc", setsDelta: 1 },
  { label: "weekPeak", detailKey: "weekPeakDesc", setsDelta: 2 },
  { label: "weekDeload", detailKey: "weekDeloadDesc", setsDelta: -1 },
];

export default function TrainingPlanClient({ mode = "suggested" }: TrainingPlanClientProps) {
  const { t, locale } = useLanguage();
  const { notify } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  void TRAINING_ANALYTICS_TODO;
  const safeT = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState<TrainingForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiTokenBalance, setAiTokenBalance] = useState<number | null>(null);
  const [aiTokenRenewalAt, setAiTokenRenewalAt] = useState<string | null>(null);
  const [lastGeneratedUsage, setLastGeneratedUsage] = useState<AiUsageSummary | null>(null);
  const [lastGeneratedAiRequestId, setLastGeneratedAiRequestId] = useState<string | null>(null);
  const [lastGeneratedPlanId, setLastGeneratedPlanId] = useState<string | null>(null);
  const [aiEntitled, setAiEntitled] = useState(false);
  const [aiEntitlementResolved, setAiEntitlementResolved] = useState(false);
  const [savedPlan, setSavedPlan] = useState<TrainingPlan | null>(null);
  const [activePlan, setActivePlan] = useState<TrainingPlan | null>(null);
  const [activePlanOrigin, setActivePlanOrigin] = useState<ActivePlanOrigin | null>(null);
  const [activePlanError, setActivePlanError] = useState<string | null>(null);
  const [storedPlanId, setStoredPlanId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConfirmSaving, setAiConfirmSaving] = useState(false);
  const [aiPreviewPlan, setAiPreviewPlan] = useState<TrainingPlan | null>(null);
  const [aiActionableError, setAiActionableError] = useState<AiErrorUiState | null>(null);
  const [tokensExhaustedModalOpen, setTokensExhaustedModalOpen] = useState(false);
  const [pendingTokenToastId, setPendingTokenToastId] = useState(0);
  const [manualPlan, setManualPlan] = useState<TrainingPlan | null>(null);
  const [canManageManualDays] = useState<boolean>(false);
  const [calendarView, setCalendarView] = useState<"week" | "month" | "list">("week");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isPlanDetailsOpen, setIsPlanDetailsOpen] = useState(false);
  const [exerciseDetail, setExerciseDetail] = useState<ExerciseDetailState | null>(null);
  const [exerciseCatalogById, setExerciseCatalogById] = useState<Record<string, ExerciseCatalogItem>>({});
  const [exerciseCatalogByName, setExerciseCatalogByName] = useState<Record<string, ExerciseCatalogItem>>({});
  const [workoutsByDate, setWorkoutsByDate] = useState<Record<string, WorkoutLookupItem[]>>({});
  const [startCtaLoading, setStartCtaLoading] = useState(false);
  const [detailsCtaLoading, setDetailsCtaLoading] = useState(false);
  const requestedCatalogExerciseIds = useRef<Set<string>>(new Set());
  const requestedCatalogExerciseNames = useRef<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState(() => {
    const dayParam = searchParams.get("day");
    const weekOffsetParam = Number(searchParams.get("weekOffset") ?? "0");
    const dayDate = parseDate(dayParam);
    if (dayDate) return dayDate;
    if (Number.isFinite(weekOffsetParam)) {
      return addWeeks(getWeekStart(new Date()), weekOffsetParam);
    }
    return new Date();
  });
  const autoGenerateRunByContext = useRef<Set<string>>(new Set());
  const aiGenerationInFlight = useRef(false);
  const [pendingAutoAiTriggerCtx, setPendingAutoAiTriggerCtx] = useState<string | null>(null);
  const calendarInitialized = useRef(false);
  const restoredContext = useRef(false);
  const renderedTokenToastId = useRef(0);
  const urlSyncInitialized = useRef(false);
  const isManualView = mode === "manual";

  const normalizeWorkoutDateKey = (scheduledAt?: string | null) => {
    if (!scheduledAt) return null;
    const parsed = new Date(scheduledAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return toDateKey(parsed);
  };

  const loadWorkoutsForLookup = async (activeRef: { current: boolean }) => {
    try {
      const response = await fetch("/api/workouts", { cache: "no-store", credentials: "include" });
      if (!response.ok || !activeRef.current) return;
      const payload = (await response.json()) as WorkoutLookupItem[];
      if (!activeRef.current || !Array.isArray(payload)) return;

      const grouped: Record<string, WorkoutLookupItem[]> = {};
      payload.forEach((workout) => {
        const dateKey = normalizeWorkoutDateKey(workout.scheduledAt);
        if (!dateKey) return;
        grouped[dateKey] = grouped[dateKey] ? [...grouped[dateKey], workout] : [workout];
      });

      setWorkoutsByDate(grouped);
    } catch (_err) {
      if (!activeRef.current) return;
    }
  };

  const loadProfile = async (activeRef: { current: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getUserProfile();
      if (!activeRef.current) return;
      setProfile(profile);
      if (isProfileComplete(profile)) {
        setForm({
          goal: profile.goal as Goal,
          level: profile.trainingPreferences.level as TrainingLevel,
          daysPerWeek: profile.trainingPreferences.daysPerWeek as TrainingForm["daysPerWeek"],
          equipment: profile.trainingPreferences.equipment as TrainingEquipment,
          focus: profile.trainingPreferences.focus as TrainingFocus,
          sessionTime: profile.trainingPreferences.sessionTime as SessionTime,
        });
      } else {
        setForm(null);
      }
      setSavedPlan(profile.trainingPlan ?? null);
    } catch (_err) {
      if (activeRef.current) setError(t("training.profileError"));
    } finally {
      if (activeRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    const ref = { current: true };
    void loadProfile(ref);
    return () => {
      ref.current = false;
    };
  }, []);

  useEffect(() => {
    const ref = { current: true };
    void loadWorkoutsForLookup(ref);
    return () => {
      ref.current = false;
    };
  }, []);

  const queryPlanId = searchParams.get("planId")?.trim() ?? "";
  const selectedPlanId = queryPlanId || storedPlanId || "";
  const searchParamsString = searchParams.toString();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persistedPlanId = (
      window.localStorage.getItem(SELECTED_PLAN_STORAGE_KEY)?.trim()
      || window.localStorage.getItem(LEGACY_ACTIVE_PLAN_STORAGE_KEY)?.trim()
      || ""
    );
    setStoredPlanId(persistedPlanId);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (queryPlanId) {
      window.localStorage.setItem(SELECTED_PLAN_STORAGE_KEY, queryPlanId);
      window.localStorage.setItem(LEGACY_ACTIVE_PLAN_STORAGE_KEY, queryPlanId);
      if (storedPlanId !== queryPlanId) {
        setStoredPlanId(queryPlanId);
      }
      return;
    }

    if (!storedPlanId) return;
    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set("planId", storedPlanId);
    const nextParamsString = nextParams.toString();
    if (nextParamsString === searchParamsString) return;
    router.replace(`${pathname}?${nextParamsString}`, { scroll: false });
  }, [pathname, queryPlanId, router, searchParamsString, storedPlanId]);

  const refreshSubscription = async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as AiEntitlementProfile & {
        aiTokenBalance?: number;
        aiTokenRenewalAt?: string | null;
      };
      setAiTokenBalance(typeof data.aiTokenBalance === "number" ? data.aiTokenBalance : null);
      setAiTokenRenewalAt(data.aiTokenRenewalAt ?? null);
      setAiEntitled(hasStrengthAiEntitlement(data));
      window.dispatchEvent(new Event("auth:refresh"));
    } catch (_err) {
    } finally {
      setAiEntitlementResolved(true);
    }
  };

  useEffect(() => {
    void refreshSubscription();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadActivePlan = async () => {
      setActivePlanError(null);
      try {
        if (selectedPlanId) {
          const selectedResponse = await fetch(`/api/training-plans/${encodeURIComponent(selectedPlanId)}`, {
            cache: "no-store",
            signal: controller.signal,
          });

          if (selectedResponse.ok) {
            const selectedPayload = (await selectedResponse.json()) as TrainingPlan;
            setActivePlan(selectedPayload);
            setActivePlanOrigin("selected");
            return;
          }
        }

        const response = await fetch("/api/training-plans/active?includeDays=1", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 404 || response.status === 405) {
          setActivePlan(null);
          setActivePlanOrigin(null);
          if (selectedPlanId) {
            setActivePlanError(t("training.selectedPlanLoadError"));
          }
          return;
        }

        if (!response.ok) {
          setActivePlan(null);
          setActivePlanOrigin(null);
          if (selectedPlanId) {
            setActivePlanError(t("training.selectedPlanLoadError"));
          }
          return;
        }

        const payload = (await response.json()) as ActiveTrainingPlanResponse;
        setActivePlan(payload.plan ?? null);
        setActivePlanOrigin(payload.plan ? "assigned" : null);
        if (selectedPlanId && payload.plan) {
          setActivePlanError(t("training.selectedPlanFallbackToAssigned"));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setActivePlan(null);
        setActivePlanOrigin(null);
        if (selectedPlanId) {
          setActivePlanError(t("training.selectedPlanLoadError"));
        }
      }
    };

    void loadActivePlan();
    return () => controller.abort();
  }, [selectedPlanId, t]);

  const plan = useMemo(() => (form ? generatePlan(form, locale, t) : null), [form, locale, t]);
  const visiblePlan = isManualView ? savedPlan ?? plan : activePlan;
  const planStartDate = useMemo(
    () => parseDate(visiblePlan?.startDate ?? visiblePlan?.days?.[0]?.date),
    [visiblePlan?.startDate, visiblePlan?.days]
  );
  const planDays = visiblePlan?.days ?? [];
  const getExerciseIdentifier = (exercise: Exercise) => {
    if (typeof exercise.exerciseId === "string" && exercise.exerciseId.trim().length > 0) return exercise.exerciseId;
    return null;
  };

  const getExerciseNameKey = (exerciseName?: string | null) => {
    if (typeof exerciseName !== "string") return null;
    const normalized = exerciseName.trim().toLowerCase().replace(/\s+/g, " ");
    return normalized.length > 0 ? normalized : null;
  };

  const getExerciseImageUrl = (exercise: Exercise) => getExerciseThumbUrl(exercise);

  const mergeExerciseWithCatalog = (exercise: Exercise): Exercise => {
    const exerciseId = getExerciseIdentifier(exercise);
    const catalogExercise = exerciseId
      ? exerciseCatalogById[exerciseId]
      : exerciseCatalogByName[getExerciseNameKey(exercise.name) ?? ""];
    if (!catalogExercise) return exercise;
    return {
      ...exercise,
      id: exercise.id ?? catalogExercise.id,
      exerciseId: exercise.exerciseId ?? catalogExercise.id,
      name: exercise.name || catalogExercise.name || exercise.name,
      imageUrl: exercise.imageUrl ?? catalogExercise.imageUrl ?? catalogExercise.posterUrl ?? undefined,
    };
  };

  const buildExerciseTechniqueHref = (exerciseId: string) => {
    const params = new URLSearchParams();
    params.set("from", "plan");
    const currentParams = new URLSearchParams(searchParamsString);
    const dayParam = toDateKey(selectedEntryDate);
    if (dayParam) {
      params.set("dayKey", dayParam);
      currentParams.set("day", dayParam);
    }
    const returnTo = `${pathname}${currentParams.toString() ? `?${currentParams.toString()}` : ""}`;
    params.set("returnTo", returnTo);
    return `/app/biblioteca/${exerciseId}?${params.toString()}`;
  };

  const planEntries = useMemo(
    () =>
      planDays
        .map((day, index) => {
          const date = day.date ? parseDate(day.date) : planStartDate ? addDays(planStartDate, index) : null;
          return date ? { day, index, date } : null;
        })
        .filter((entry): entry is { day: TrainingDay; index: number; date: Date } => Boolean(entry)),
    [planDays, planStartDate]
  );
  const maxProjectedWeeksAhead = 3;
  const {
    planStartDate: normalizedPlanStartDate,
    clampedSelectedDate,
    weekStart,
    minWeekStart,
    canGoPrevWeek,
    weekDates,
    monthDates,
  } = useTrainingCalendar(selectedDate, planStartDate);
  const weekOffset = useMemo(() => getWeekOffsetFromCurrent(weekStart), [weekStart]);
  const modelWeekStart = useMemo(() => {
    if (planEntries.length > 0) {
      return getWeekStart(planEntries[0].date);
    }
    return getWeekStart(new Date());
  }, [planEntries]);
  const projectedWeek = useMemo(
    () => projectDaysForWeek({ entries: planEntries, selectedWeekStart: weekStart, modelWeekStart }),
    [planEntries, weekStart, modelWeekStart]
  );
  const visiblePlanEntries = useMemo(() => {
    const all = new Map<string, { day: TrainingDay; index: number; date: Date; isReplicated: boolean }>();
    planEntries.forEach((entry) => {
      all.set(toDateKey(entry.date), { ...entry, isReplicated: false });
    });
    for (let offset = 1; offset <= maxProjectedWeeksAhead; offset += 1) {
      const nextWeek = projectDaysForWeek({
        entries: planEntries,
        selectedWeekStart: addWeeks(getWeekStart(new Date()), offset),
        modelWeekStart,
      });
      if (!nextWeek.isReplicated) continue;
      nextWeek.days.forEach((entry) => {
        const key = toDateKey(entry.date);
        if (!all.has(key)) {
          all.set(key, { ...entry, isReplicated: true });
        }
      });
    }
    return Array.from(all.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [maxProjectedWeeksAhead, planEntries, modelWeekStart]);

  useEffect(() => {
    const exerciseIds = Array.from(
      new Set(
        planDays
          .flatMap((day) => day.exercises)
          .map((exercise) => getExerciseIdentifier(exercise))
          .filter((id): id is string => Boolean(id))
      )
    );
    const missingExerciseIds = exerciseIds.filter(
      (id) => !exerciseCatalogById[id] && !requestedCatalogExerciseIds.current.has(id)
    );
    if (missingExerciseIds.length === 0) return;

    missingExerciseIds.forEach((id) => requestedCatalogExerciseIds.current.add(id));

    let active = true;
    const loadCatalogExercises = async () => {
      const responses = await Promise.allSettled(
        missingExerciseIds.map(async (exerciseId) => {
          const response = await fetch(`/api/exercises/${exerciseId}`, {
            cache: "no-store",
            credentials: "include",
          });
          if (!response.ok) return null;
          return (await response.json()) as ExerciseCatalogItem;
        })
      );
      if (!active) return;

      setExerciseCatalogById((prev) => {
        const next = { ...prev };
        for (const result of responses) {
          if (result.status !== "fulfilled" || !result.value?.id) continue;
          next[result.value.id] = result.value;
        }
        return next;
      });
    };

    void loadCatalogExercises();
    return () => {
      active = false;
    };
  }, [exerciseCatalogById, planDays]);

  useEffect(() => {
    const exerciseNameQueries = new Map<string, string>();
    planDays.forEach((day) => {
      day.exercises.forEach((exercise) => {
        if (getExerciseIdentifier(exercise)) return;
        if (getExerciseImageUrl(exercise)) return;
        const nameKey = getExerciseNameKey(exercise.name);
        if (!nameKey || exerciseNameQueries.has(nameKey)) return;
        exerciseNameQueries.set(nameKey, exercise.name.trim());
      });
    });

    const missingNameKeys = Array.from(exerciseNameQueries.keys()).filter(
      (nameKey) => !exerciseCatalogByName[nameKey] && !requestedCatalogExerciseNames.current.has(nameKey)
    );
    if (missingNameKeys.length === 0) return;

    missingNameKeys.forEach((nameKey) => requestedCatalogExerciseNames.current.add(nameKey));

    let active = true;
    const loadCatalogByName = async () => {
      const responses = await Promise.allSettled(
        missingNameKeys.map(async (nameKey) => {
          const query = exerciseNameQueries.get(nameKey);
          if (!query) return null;
          const params = new URLSearchParams();
          params.set("query", query);
          params.set("limit", "8");
          params.set("page", "1");
          params.set("offset", "0");
          const response = await fetch(`/api/exercises?${params.toString()}`, {
            cache: "no-store",
            credentials: "include",
          });
          if (!response.ok) return null;

          const payload = (await response.json()) as {
            items?: ExerciseCatalogItem[];
            data?: ExerciseCatalogItem[];
          };
          const candidates = Array.isArray(payload.items)
            ? payload.items
            : Array.isArray(payload.data)
              ? payload.data
              : [];
          const byName = candidates.find((item) => getExerciseNameKey(item.name) === nameKey);
          const candidate = byName ?? candidates[0] ?? null;
          if (!candidate?.id) return null;
          return { nameKey, item: candidate };
        })
      );
      if (!active) return;

      setExerciseCatalogByName((prev) => {
        const next = { ...prev };
        for (const result of responses) {
          if (result.status !== "fulfilled" || !result.value) continue;
          next[result.value.nameKey] = result.value.item;
        }
        return next;
      });
    };

    void loadCatalogByName();
    return () => {
      active = false;
    };
  }, [exerciseCatalogByName, planDays]);
  const visibleDayMap = useMemo(() => {
    const next = new Map<string, { day: TrainingDay; index: number; date: Date; isReplicated: boolean }>();
    visiblePlanEntries.forEach((entry) => {
      next.set(toDateKey(entry.date), entry);
    });
    return next;
  }, [visiblePlanEntries]);
  const localeCode = locale === "es" ? "es-ES" : locale === "pt" ? "pt-PT" : "en-US";
  const monthLabel = clampedSelectedDate.toLocaleDateString(localeCode, { month: "long", year: "numeric" });
  const today = useMemo(() => clampDateNotBefore(new Date(), normalizedPlanStartDate), [normalizedPlanStartDate]);
  const calendarOptions = useMemo(() => [
    { value: "week", label: t("calendar.viewWeek") },
    { value: "list", label: t("calendar.viewList") },
    ...(isMobileViewport ? [] : [{ value: "month", label: t("calendar.viewMonth") }]),
  ], [isMobileViewport, t]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setIsMobileViewport(media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) return;
    if (calendarView !== "month") return;
    setCalendarView("week");
  }, [calendarView, isMobileViewport]);

  useEffect(() => {
    if (manualPlan) return;
    if (savedPlan) {
      setManualPlan(savedPlan);
      return;
    }
    if (plan) {
      setManualPlan(plan);
      return;
    }
    if (form) {
      setManualPlan(createEmptyPlan(form.daysPerWeek, locale, t));
    }
  }, [manualPlan, savedPlan, plan, form, locale, t]);

  useEffect(() => {
    if (!normalizedPlanStartDate || calendarInitialized.current) return;
    calendarInitialized.current = true;
    const todayDate = new Date();
    setSelectedDate(clampDateNotBefore(todayDate, normalizedPlanStartDate));
  }, [normalizedPlanStartDate]);

  useEffect(() => {
    if (!normalizedPlanStartDate) return;
    if (selectedDate.getTime() === clampedSelectedDate.getTime()) return;
    setSelectedDate(clampedSelectedDate);
  }, [clampedSelectedDate, normalizedPlanStartDate, selectedDate]);

  const ensurePlanStartDate = (planData: TrainingPlan, date = new Date()) => {
    const baseDate = parseDate(planData.startDate) ?? date;
    const days = planData.days.map((day, index) => ({
      ...day,
      date: day.date ?? toDateKey(addDays(baseDate, index)),
    }));
    return { ...planData, startDate: baseDate.toISOString(), days };
  };

  const handleSavePlan = async () => {
    if (!plan) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const nextPlan = ensurePlanStartDate(plan);
      const updated = await updateUserProfile({ trainingPlan: nextPlan });
      setSavedPlan(updated.trainingPlan ?? nextPlan);
      setSaveMessage(t("training.savePlanSuccess"));
    } catch (_err) {
      setSaveMessage(t("training.savePlanError"));
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  const handleSaveManualPlan = async () => {
    if (!manualPlan) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const nextPlan = ensurePlanStartDate(manualPlan);
      const updated = await updateUserProfile({ trainingPlan: nextPlan });
      setSavedPlan(updated.trainingPlan ?? nextPlan);
      setSaveMessage(t("training.manualSaveSuccess"));
    } catch (_err) {
      setSaveMessage(t("training.savePlanError"));
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  const handleSetStartDate = async () => {
    if (!visiblePlan) return;
    const nextPlan = ensurePlanStartDate({ ...visiblePlan, startDate: new Date().toISOString() });
    const updated = await updateUserProfile({ trainingPlan: nextPlan });
    setSavedPlan(updated.trainingPlan ?? nextPlan);
    setManualPlan(updated.trainingPlan ?? nextPlan);
  };

  function updateManualDay(dayIndex: number, field: keyof TrainingDay, value: string | number) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const day = { ...days[dayIndex], [field]: value };
      days[dayIndex] = day;
      return { ...prev, days };
    });
  }

  function updateManualExercise(
    dayIndex: number,
    exerciseIndex: number,
    field: keyof Exercise,
    value: string
  ) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const exercises = [...days[dayIndex].exercises];
      exercises[exerciseIndex] = { ...exercises[exerciseIndex], [field]: value };
      days[dayIndex] = { ...days[dayIndex], exercises };
      return { ...prev, days };
    });
  }

  function addManualExercise(dayIndex: number) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const exercises = [...days[dayIndex].exercises, { name: "", sets: "", reps: "" }];
      days[dayIndex] = { ...days[dayIndex], exercises };
      return { ...prev, days };
    });
  }

  function removeManualExercise(dayIndex: number, exerciseIndex: number) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const exercises = days[dayIndex].exercises.filter((_, index) => index !== exerciseIndex);
      days[dayIndex] = { ...days[dayIndex], exercises };
      return { ...prev, days };
    });
  }


  function addManualDay() {
    if (!canManageManualDays) return;
    setManualPlan((prev) => {
      if (!prev) return prev;
      const nextIndex = prev.days.length;
      return {
        ...prev,
        days: [
          ...prev.days,
          {
            label: `${t("training.dayLabel")} ${nextIndex + 1}`,
            focus: t("training.focusFullBody"),
            duration: 45,
            exercises: [],
          },
        ],
      };
    });
  }

  function removeManualDay(dayIndex: number) {
    if (!canManageManualDays) return;
    setManualPlan((prev) => {
      if (!prev) return prev;
      if (prev.days.length <= 1) return prev;
      return {
        ...prev,
        days: prev.days.filter((_, index) => index !== dayIndex),
      };
    });
  }

  const handleAiPlan = async () => {
    if (!profile || !form || aiGenerationInFlight.current || aiLoading) return;
    if (!aiEntitled) return;
    if (aiTokenBalance !== null && aiTokenBalance <= 0) {
      setAiActionableError(mapAiErrorToUiState({ code: "INSUFFICIENT_TOKENS" }, t));
      setTokensExhaustedModalOpen(true);
      return;
    }
    if (!isProfileComplete(profile)) {
      router.push("/app/onboarding?ai=training&next=/app/entrenamiento");
      return;
    }
    aiGenerationInFlight.current = true;
    setAiLoading(true);
    setError(null);
    setAiActionableError(null);
    try {
      const result = await requestAiTrainingPlan(profile, {
        goal: form.goal,
        level: form.level,
        daysPerWeek: form.daysPerWeek,
        equipment: form.equipment,
        focus: form.focus,
        sessionTime: form.sessionTime,
      });
      const tokensAfter = await readAiTokenSnapshot();
      const currentTokenBalance =
        tokensAfter.tokens
        ?? (typeof result.aiTokenBalance === "number" ? result.aiTokenBalance : null)
        ?? (typeof result.usage?.balanceAfter === "number" ? result.usage.balanceAfter : null)
        ?? (typeof result.balanceAfter === "number" ? result.balanceAfter : null);

      if (currentTokenBalance !== null) {
        setAiTokenBalance(currentTokenBalance);
      }
      if (typeof result.aiTokenRenewalAt === "string" || result.aiTokenRenewalAt === null) {
        setAiTokenRenewalAt(result.aiTokenRenewalAt ?? null);
      }
      setLastGeneratedUsage(result.usage ?? null);
      setLastGeneratedAiRequestId(result.aiRequestId ?? null);
      setLastGeneratedPlanId(result.planId ?? null);
      setAiPreviewPlan(result.plan);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TRAINING_PLANS_UPDATED_AT_KEY, String(Date.now()));
      }
      setPendingTokenToastId((value) => value + 1);
      setSaveMessage(t("training.aiPreviewReady"));
      void refreshSubscription();
    } catch (err) {
      const status = err instanceof AiPlanRequestError ? err.status : null;
      const code = err instanceof AiPlanRequestError ? err.code ?? null : err instanceof Error ? err.message : null;
      const kind = err instanceof AiPlanRequestError ? err.kind ?? null : null;
      setAiActionableError(mapAiErrorToUiState({ status, code, kind }, t));
      if (classifyAiError({ status, code, kind }) === "quota") {
        setTokensExhaustedModalOpen(true);
      }
      notify({
        title: safeT("training.aiRetryErrorTitle", "No pudimos generar tu plan con IA"),
        variant: "error",
      });
    } finally {
      aiGenerationInFlight.current = false;
      setAiLoading(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  useEffect(() => {
    if (!shouldTriggerAiGeneration(searchParams.get("ai"))) return;

    const ctxKey = searchParams.get("ctx") ?? pathname;
    if (autoGenerateRunByContext.current.has(ctxKey)) return;

    if (typeof window !== "undefined") {
      const storageKey = `fs_ai_generate_once:${ctxKey}`;
      const rawStoredValue = window.sessionStorage.getItem(storageKey);
      const storedTimestamp = Number(rawStoredValue ?? "0");
      const now = Date.now();
      if (Number.isFinite(storedTimestamp) && now - storedTimestamp < AUTO_AI_TRIGGER_GUARD_TTL_MS) {
        return;
      }
      window.sessionStorage.setItem(storageKey, String(now));
    }

    autoGenerateRunByContext.current.add(ctxKey);
    setPendingAutoAiTriggerCtx(ctxKey);

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.delete("ai");
    const nextParamsString = nextParams.toString();
    const nextUrl = `${pathname}${nextParamsString ? `?${nextParamsString}` : ""}`;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams, searchParamsString]);

  useEffect(() => {
    if (!pendingAutoAiTriggerCtx) return;
    if (!profile || !form) return;
    if (!aiEntitlementResolved) return;
    if (!aiEntitled) {
      setPendingAutoAiTriggerCtx(null);
      return;
    }
    setPendingAutoAiTriggerCtx(null);
    void handleAiPlan();
  }, [aiEntitled, aiEntitlementResolved, form, pendingAutoAiTriggerCtx, profile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (restoredContext.current) return;
    const ctxKey = searchParams.get("ctx");
    if (!ctxKey) return;
    const stored = window.sessionStorage.getItem(ctxKey);
    if (!stored) return;
    restoredContext.current = true;
    try {
      const parsed = JSON.parse(stored) as {
        scrollY?: number;
        selectedDate?: string;
        calendarView?: string;
      };
      if (parsed.selectedDate) {
        const nextDate = new Date(parsed.selectedDate);
        if (!Number.isNaN(nextDate.getTime())) {
          setSelectedDate(nextDate);
        }
      }
      if (parsed.calendarView && ["week", "month", "list"].includes(parsed.calendarView)) {
        setCalendarView(parsed.calendarView as typeof calendarView);
      }
      if (typeof parsed.scrollY === "number") {
        window.requestAnimationFrame(() => {
          window.scrollTo(0, parsed.scrollY ?? 0);
        });
      }
      window.sessionStorage.removeItem(ctxKey);
      const nextParams = new URLSearchParams(searchParamsString);
      nextParams.delete("ctx");
      const nextParamsString = nextParams.toString();
      const nextUrl = `${pathname}${nextParamsString ? `?${nextParamsString}` : ""}`;
      router.replace(nextUrl);
    } catch (_err) {
      window.sessionStorage.removeItem(ctxKey);
    }
  }, [calendarView, pathname, router, searchParams, searchParamsString]);

  useEffect(() => {
    if (!urlSyncInitialized.current) {
      urlSyncInitialized.current = true;
      return;
    }
    const params = new URLSearchParams(searchParamsString);
    const offset = getWeekOffsetFromCurrent(weekStart);
    const nextDayKey = clampDayKeyToPlanStart(toDateKey(clampedSelectedDate), normalizedPlanStartDate);
    if (nextDayKey) {
      params.set("day", nextDayKey);
    } else {
      params.delete("day");
    }
    if (offset !== 0) {
      params.set("weekOffset", String(offset));
    } else {
      params.delete("weekOffset");
    }
    const nextParamsString = params.toString();
    if (nextParamsString === searchParamsString) return;
    const nextUrl = `${pathname}${nextParamsString ? `?${nextParamsString}` : ""}`;
    router.replace(nextUrl, { scroll: false });
  }, [clampedSelectedDate, normalizedPlanStartDate, pathname, router, searchParamsString, weekStart]);

  const handleGenerateClick = () => {
    if (aiGenerationInFlight.current || aiLoading || !profile) return;
    if (!aiEntitled) {
      const currentRoute = `${pathname}${searchParamsString ? `?${searchParamsString}` : ""}`;
      const billingHref = `/app/settings/billing?returnTo=${encodeURIComponent(currentRoute)}`;
      setAiActionableError({ title: t("ai.errorState.title"), description: safeT("training.aiModuleRequired", "Requiere StrengthAI o PRO"), ctaHref: billingHref, ctaLabel: t("billing.manageBilling") });
      return;
    }
    if (aiTokenBalance !== null && aiTokenBalance <= 0) {
      setAiActionableError(mapAiErrorToUiState({ code: "INSUFFICIENT_TOKENS" }, t));
      setTokensExhaustedModalOpen(true);
      return;
    }
    if (!isProfileComplete(profile)) {
      router.push("/app/onboarding?ai=training&next=/app/entrenamiento");
      return;
    }
    setAiActionableError(null);
    void handleAiPlan();
  };

  const handleConfirmAiPlan = async () => {
    if (!aiPreviewPlan) return;
    setAiConfirmSaving(true);
    setError(null);
    try {
      const updated = await saveAiTrainingPlan(aiPreviewPlan);
      const aiPlanId = lastGeneratedPlanId?.trim() || null;
      if (typeof window !== "undefined" && aiPlanId) {
        window.localStorage.setItem(SELECTED_PLAN_STORAGE_KEY, aiPlanId);
        window.localStorage.setItem(LEGACY_ACTIVE_PLAN_STORAGE_KEY, aiPlanId);
        window.localStorage.setItem(TRAINING_PLANS_UPDATED_AT_KEY, String(Date.now()));
        const nextParams = new URLSearchParams(searchParamsString);
        nextParams.set("planId", aiPlanId);
        const nextParamsString = nextParams.toString();
        const nextUrl = `${pathname}${nextParamsString ? `?${nextParamsString}` : ""}`;
        router.replace(nextUrl, { scroll: false });
      } else if (typeof window !== "undefined") {
        window.localStorage.setItem(TRAINING_PLANS_UPDATED_AT_KEY, String(Date.now()));
      }
      setSavedPlan(updated.trainingPlan ?? aiPreviewPlan);
      setAiPreviewPlan(null);
      setSaveMessage(t("training.aiSuccess"));
    } catch (_err) {
      setError(t("training.savePlanError"));
    } finally {
      setAiConfirmSaving(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  const hasPlan = Boolean(visiblePlan?.days.length);

  const closeExerciseDetail = () => {
    setExerciseDetail(null);
  };
  const todayKey = toDateKey(today);
  const selectedEntry = visibleDayMap.get(toDateKey(clampedSelectedDate)) ?? null;
  const selectedEntryDate = clampedSelectedDate;
  const selectedExercises = (selectedEntry?.day.exercises ?? []).map(mergeExerciseWithCatalog);
  const selectedDayIsRest = selectedExercises.length === 0;
  const nextPlannedEntry = visiblePlanEntries.find((entry) => entry.date.getTime() >= today.getTime()) ?? selectedEntry;
  const detailExerciseId = exerciseDetail ? getExerciseIdentifier(exerciseDetail.exercise) : null;
  const dayEditorPlanId = selectedPlanId.trim();
  const dayEditorDay = toDateKey(selectedEntryDate);
  const canOpenDayEditor = Boolean(dayEditorPlanId && dayEditorDay);
  const dayEditorHref = `/app/entrenamiento/editar?planId=${encodeURIComponent(dayEditorPlanId)}&day=${encodeURIComponent(dayEditorDay)}`;
  const selectedDayHasWorkout = selectedExercises.length > 0;
  const nextEntryHasWorkout = (nextPlannedEntry?.day.exercises?.length ?? 0) > 0;
  const normalizeName = (value?: string | null) => (value ?? "").trim().toLowerCase();
  const pickWorkoutIdForDate = (date: Date, focus?: string | null) => {
    const dateKey = toDateKey(date);
    const candidates = workoutsByDate[dateKey] ?? [];
    if (candidates.length === 0) return null;

    const focusName = normalizeName(focus);
    if (focusName) {
      const byName = candidates.find((candidate) => normalizeName(candidate.name).includes(focusName) || focusName.includes(normalizeName(candidate.name)));
      if (byName?.id) return byName.id;
    }

    return candidates[0]?.id ?? null;
  };
  const nextPlannedWorkoutId = nextPlannedEntry ? pickWorkoutIdForDate(nextPlannedEntry.date, nextPlannedEntry.day.focus) : null;

  const completedDayKeys = useMemo(() => {
    const keys = new Set<string>();
    Object.entries(workoutsByDate).forEach(([dateKey, workouts]) => {
      if (workouts.some((workout) => Array.isArray(workout.sessions) && workout.sessions.some((session: { finishedAt?: string | null }) => Boolean(session.finishedAt)))) {
        keys.add(dateKey);
      }
    });
    return keys;
  }, [workoutsByDate]);

  const isSelectedDayToday = isSameDay(selectedEntryDate, today);
  const displayWeekNumber = useMemo(() => {
    const weekOneStart = minWeekStart ?? modelWeekStart;
    return Math.max(1, Math.floor(differenceInDays(weekStart, weekOneStart) / 7) + 1);
  }, [minWeekStart, modelWeekStart, weekStart]);

  const parseRepsFromSets = (sets: string | number) => {
    if (typeof sets !== "string") return null;
    const match = sets.match(/x\s*(.+)$/i);
    return match?.[1]?.trim() || null;
  };

  const buildWorkoutPayload = (entry: PlanEntry) => {
    const isoDate = new Date(`${toDateKey(entry.date)}T12:00:00`).toISOString();
    return {
      name: entry.day.focus || entry.day.label || safeT("training.calendarTitle", "Plan de entrenamiento"),
      notes: `${safeT("training.dayLabel", "Dia")}: ${entry.day.label}`,
      scheduledAt: isoDate,
      durationMin: entry.day.duration || 45,
      exercises: (entry.day.exercises ?? []).map((exercise, index) => ({
        exerciseId: getExerciseIdentifier(exercise) ?? undefined,
        name: exercise.name,
        sets: String(exercise.sets ?? "").trim() || undefined,
        reps: (() => {
          const value = exercise.reps ?? parseRepsFromSets(exercise.sets);
          return value ? String(value) : undefined;
        })(),
        notes: exercise.notes ?? undefined,
        order: index,
      })),
    };
  };

  const ensureWorkoutIdForEntry = async (entry: PlanEntry) => {
    const existingId = pickWorkoutIdForDate(entry.date, entry.day.focus);
    if (existingId) return existingId;

    const createResponse = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(buildWorkoutPayload(entry)),
    });
    if (!createResponse.ok) return null;

    const created = (await createResponse.json()) as WorkoutLookupItem | null;
    const createdId = created?.id ?? null;
    if (!createdId) return null;

    const refreshed = { current: true };
    await loadWorkoutsForLookup(refreshed);
    return createdId;
  };

  const openSelectedDayStart = async () => {
    if (!selectedEntry || !selectedDayHasWorkout || startCtaLoading) return;
    setStartCtaLoading(true);
    try {
      const workoutId = await ensureWorkoutIdForEntry(selectedEntry);
      if (!workoutId) {
        notify({ title: safeT("training.openSessionError", "No pudimos abrir la sesion."), variant: "error" });
        router.push("/app/entrenamiento");
        return;
      }
      router.push(`/app/entrenamiento/${encodeURIComponent(workoutId)}/start`);
    } catch (_err) {
      notify({ title: safeT("training.openSessionError", "No pudimos abrir la sesion."), variant: "error" });
      router.push("/app/entrenamiento");
    } finally {
      setStartCtaLoading(false);
    }
  };


  const openSelectedDayDetails = async () => {
    if (!selectedEntry || !selectedDayHasWorkout || detailsCtaLoading) return;
    setDetailsCtaLoading(true);
    try {
      const workoutId = await ensureWorkoutIdForEntry(selectedEntry);
      if (!workoutId) {
        notify({ title: safeT("training.openDetailsError", "No pudimos abrir los detalles."), variant: "error" });
        router.push("/app/entrenamiento");
        return;
      }
      router.push(`/app/entrenamiento/${encodeURIComponent(workoutId)}`);
    } catch (_err) {
      notify({ title: safeT("training.openDetailsError", "No pudimos abrir los detalles."), variant: "error" });
      router.push("/app/entrenamiento");
    } finally {
      setDetailsCtaLoading(false);
    }
  };

  const openNextDayDetails = async () => {
    if (!nextPlannedEntry || !nextEntryHasWorkout || detailsCtaLoading) return;
    setDetailsCtaLoading(true);
    try {
      const workoutId = nextPlannedWorkoutId ?? (await ensureWorkoutIdForEntry(nextPlannedEntry));
      if (!workoutId) {
        notify({ title: safeT("training.openDetailsError", "No pudimos abrir los detalles."), variant: "error" });
        router.push("/app/entrenamiento");
        return;
      }
      router.push(`/app/entrenamiento/${encodeURIComponent(workoutId)}`);
    } catch (_err) {
      notify({ title: safeT("training.openDetailsError", "No pudimos abrir los detalles."), variant: "error" });
      router.push("/app/entrenamiento");
    } finally {
      setDetailsCtaLoading(false);
    }
  };

  const estimatedCompletedSessions = visiblePlanEntries.filter((entry) => completedDayKeys.has(toDateKey(entry.date))).length;
  const totalPlannedSessions = Math.max(visiblePlanEntries.length, 1);
  const progressPercent = Math.min(100, Math.round((estimatedCompletedSessions / totalPlannedSessions) * 100));
  const selectedEntryDateLabel = selectedEntryDate.toLocaleDateString(localeCode, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  const nextPlannedEntryDateLabel = nextPlannedEntry?.date.toLocaleDateString(localeCode, {
    weekday: "long",
    day: "numeric",
    month: "short",
  }) ?? "";
  const resultBalancePlaceholder = lastGeneratedUsage?.balanceAfter ?? aiTokenBalance;

  useEffect(() => {
    if (!hasPlan) return;
    if (!pendingTokenToastId) return;
    if (renderedTokenToastId.current === pendingTokenToastId) return;
    renderedTokenToastId.current = pendingTokenToastId;
    notify({
      title: t("ai.tokenConsumed"),
      variant: "success",
    });
  }, [hasPlan, notify, pendingTokenToastId, t]);
  const isAiLocked = !aiEntitled;
  const isOutOfTokens = aiTokenBalance !== null && aiTokenBalance <= 0;
  const aiLockDescription = safeT("training.aiModuleRequired", "Requiere StrengthAI o PRO");
  const isAiDisabled = aiLoading || isAiLocked || isOutOfTokens || !form;
  const handleProfileRetry = () => {
    const ref = { current: true };
    void loadProfile(ref);
  };

  const handleAiRetry = () => {
    if (aiGenerationInFlight.current || aiLoading || !profile || !form) return;
    setAiActionableError(null);
    void handleAiPlan();
  };
  const buildSetLines = (exercise: Exercise) => {
    const setsValue = String(exercise.sets);
    const match = setsValue.match(/\d+/);
    const count = match ? Number(match[0]) : 1;
    const detail = exercise.reps ? `${exercise.reps} ${t("training.repsLabel")}` : setsValue;
    return Array.from({ length: Math.max(1, count) }, (_, index) => ({
      id: `${exercise.name}-${index}`,
      label: `${index + 1}. ${t("training.setLabel")} ${detail}`,
    }));
  };

  const trainingPlanDetails = (
    <section className="card">
      <button
        type="button"
        className="btn secondary fit-content"
        aria-expanded={isPlanDetailsOpen}
        aria-controls="training-plan-details"
        onClick={() => setIsPlanDetailsOpen((prev) => !prev)}
      >
        {isPlanDetailsOpen ? t("training.planDetails.hide") : t("training.planDetails.show")}
        <Icon
          name="chevron-down"
          size={16}
          className="ml-6"
          style={{ transform: isPlanDetailsOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 160ms ease" }}
        />
      </button>

      <div id="training-plan-details" role="region" aria-label={t("training.planDetails.title")} hidden={!isPlanDetailsOpen} className="mt-12">
        <h2 className="section-title section-title-sm">{t("training.planDetails.title")}</h2>

        {aiTokenBalance !== null ? (
          <p className="muted mt-8 plan-token-line">
            {t("ai.tokensRemaining")} {aiTokenBalance}
            {aiTokenRenewalAt ? ` · ${t("ai.tokensReset")} ${formatDate(aiTokenRenewalAt)}` : ""}
          </p>
        ) : null}

        {isAiLocked ? (
          <AiModuleUpgradeCTA
            title={t("aiLockedTitle")}
            description={aiLockDescription}
            buttonLabel={t("billing.upgradePro")}
          />
        ) : null}

        {loading ? (
          <div className="form-stack mt-12">
            <Skeleton variant="line" className="w-40" />
            <Skeleton variant="line" className="w-60" />
          </div>
        ) : error ? (
          <div className="mt-12">
            <ErrorBlock
              title={t("training.errorTitle")}
              description={error}
              retryAction={
                <button type="button" className="btn secondary fit-content" onClick={handleProfileRetry}>
                  {t("ui.retry")}
                </button>
              }
            />
          </div>
        ) : saveMessage ? (
          <p className="muted mt-12">{saveMessage}</p>
        ) : null}

        {form ? (
          <>
            <div className="badge-list plan-summary-chips mt-12">
              <Badge>
                {t("training.goal")}: {t(form.goal === "cut" ? "training.goalCut" : form.goal === "bulk" ? "training.goalBulk" : "training.goalMaintain")}
              </Badge>
              <Badge>
                {t("training.level")}: {t(form.level === "beginner" ? "training.levelBeginner" : form.level === "intermediate" ? "training.levelIntermediate" : "training.levelAdvanced")}
              </Badge>
              <Badge>{t("training.daysPerWeek")}: {form.daysPerWeek}</Badge>
              <Badge>
                {t("training.equipment")}: {form.equipment === "gym" ? t("training.equipmentGym") : t("training.equipmentHome")}
              </Badge>
              <Badge>
                {t("training.sessionTime")}: {t(form.sessionTime === "short" ? "training.sessionTimeShort" : form.sessionTime === "long" ? "training.sessionTimeLong" : "training.sessionTimeMedium")}
              </Badge>
              <Badge>
                {t("training.focus")}: {t(form.focus === "ppl" ? "training.focusPushPullLegs" : form.focus === "upperLower" ? "training.focusUpperLower" : "training.focusFullBody")}
              </Badge>
            </div>

            <p className="muted mt-12">{t("training.preferencesHint")}</p>

            {canOpenDayEditor ? (
              <Link href={dayEditorHref} className="btn secondary mt-12 fit-content">
                {t("training.editPlan")}
              </Link>
            ) : (
              <p className="muted mt-12">
                {safeT("training.editPlanRequiresSelection", "Editar ejercicios requiere seleccionar un plan activo.")}
              </p>
            )}
          </>
        ) : null}
      </div>
    </section>
  );

  return (
    <div className="page page-with-tabbar-safe-area nutrition-page-shell training-plan-layout">
      {!isManualView ? (
        <>
          {!loading && !error && profile && !isProfileComplete(profile) ? (
            <section className="card">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Icon name="info" />
                </div>
                <div>
                  <h3 className="m-0">{t("training.profileIncompleteTitle")}</h3>
                  <p className="muted">{t("training.profileIncompleteSubtitle")}</p>
                </div>
                <ButtonLink href="/app/onboarding?next=/app/entrenamiento">
                  {t("profile.openOnboarding")}
                </ButtonLink>
              </div>
            </section>
          ) : !loading && !error && !hasPlan ? (
            <section className="card">
              <EmptyState
                icon="dumbbell"
                title={safeT("training.noSelectedPlanTitle", "Aún no tienes un plan de entrenamiento activo")}
                description={safeT(
                  "training.noSelectedPlanSubtitle",
                  "Selecciona un plan existente o genera uno nuevo con IA para ver tu calendario de entrenamiento."
                )}
                actions={isAiLocked
                  ? [
                    { label: safeT("training.selectPlanCta", "Seleccionar plan"), href: "/app/biblioteca/entrenamientos" },
                    { label: t("billing.manageBilling"), href: "/app/settings/billing", variant: "secondary" },
                    { label: safeT("training.manualCreate", "Crear manual"), href: "/app/entrenamiento/editar", variant: "secondary" },
                  ]
                  : [
                    { label: safeT("training.selectPlanCta", "Seleccionar plan"), href: "/app/biblioteca/entrenamientos" },
                    { label: safeT("training.createPlanCta", "Crear con IA"), href: "/app/entrenamiento?ai=1", variant: "secondary" },
                    { label: safeT("training.manualCreate", "Crear manual"), href: "/app/entrenamiento/editar", variant: "secondary" },
                  ]}
              />
              {isAiLocked ? (
                <div className="mt-12">
                  <AiModuleUpgradeCTA
                    title={t("aiLockedTitle")}
                    description={aiLockDescription}
                    buttonLabel={t("billing.upgradePro")}
                  />
                </div>
              ) : null}
            </section>
          ) : hasPlan ? (
            <>
              <section className="card premium-hero-card surface-action-card training-main-section">
                <div className="training-hero">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                        <path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M3 10v4"/><path d="M21 10v4"/><path d="M6 6v12"/><path d="M18 6v12"/><path d="M6 14h.01"/><path d="M18 14h.01"/>
                      </svg>
                    </div>
                    <div>
                      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{safeT("training.dayTrainingTitle", "Entrenamiento del dia")}</p>
                      <h2 className="m-0 mt-1 text-[1.9rem] font-semibold leading-tight text-primary">
                        {selectedDayIsRest
                          ? safeT("training.restDayTitle", "Descanso")
                          : selectedEntry?.day?.focus || safeT("training.calendarTitle", "Plan de entrenamiento")}
                      </h2>
                      {!selectedDayIsRest ? (
                        <p className="m-0 mt-1 text-sm text-muted">{isSelectedDayToday ? safeT("training.selectedDayTodayLabel", "Hoy") : selectedEntryDateLabel}</p>
                      ) : null}
                    </div>
                  </div>
                  {selectedDayHasWorkout ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn rounded-xl h-11 min-w-[148px] px-5 font-semibold"
                        onClick={() => void openSelectedDayStart()}
                        disabled={startCtaLoading}
                        aria-label={safeT("training.startSessionAria", "Empezar sesion del dia seleccionado")}
                      >
                        {startCtaLoading ? t("ui.loading") : safeT("training.startSession", "Empezar")}
                      </button>
                      <button
                        type="button"
                        className="btn secondary fit-content rounded-xl h-10 px-3 text-sm"
                        onClick={() => void openSelectedDayDetails()}
                        disabled={detailsCtaLoading}
                        aria-label={safeT("training.detailsSessionAria", "Ver detalles del dia seleccionado")}
                      >
                        {detailsCtaLoading ? t("ui.loading") : safeT("training.detailsCta", "Detalles")}
                      </button>
                    </div>
                  ) : null}
                </div>

                <p className="training-hero-meta mt-3 text-sm text-muted">
                  {!selectedDayHasWorkout
                    ? safeT("training.restDaySubtitle", "Dia de recuperacion activa.")
                    : selectedEntry
                      ? `${selectedEntry.day.duration} min · ${selectedEntry.day.exercises?.length || 0} ejercicios`
                      : t("training.calendarEmptyFocus")}
                </p>

                {isOutOfTokens ? <p className="muted mt-4">{t("ai.insufficientTokens")}</p> : null}

                {aiActionableError ? (
                  <div className="mt-6">
                    <ErrorBlock
                      title={safeT("training.aiRetryErrorTitle", "No pudimos generar tu plan con IA")}
                      description={aiActionableError.description}
                      retryAction={
                        <div className="flex gap-2 mt-3">
                          <button type="button" className="btn secondary rounded-xl" onClick={handleAiRetry} disabled={aiLoading}>
                            {t("ui.retry")}
                          </button>
                          {aiActionableError.ctaHref && aiActionableError.ctaLabel ? (
                            <Link className="btn secondary rounded-xl" href={aiActionableError.ctaHref}>
                              {aiActionableError.ctaLabel}
                            </Link>
                          ) : null}
                        </div>
                      }
                    />
                  </div>
                ) : null}

                <div className="training-progress mt-4">
                  <div className="training-progress-head">
                    <span className="text-xs font-medium text-muted">Progreso</span>
                    <span className="text-xs font-semibold text-primary">{progressPercent}%</span>
                  </div>
                  <div className="training-progress-track">
                    <span className="training-progress-fill" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="m-0 text-xs text-muted">
                    {estimatedCompletedSessions}/{totalPlannedSessions} sesiones completadas
                  </p>
                </div>
              </section>

              <div className="training-weekly-flow training-main-section">
              <section className="card premium-surface-card surface-content-card training-weekly-section training-weekly-section--calendar">
              <div className="section-head section-head-actions">
                <div>
                  <h2 className="section-title section-title-sm hidden sm:block">{t("training.calendarTitle")}</h2>
                </div>
                <div className="section-actions calendar-actions">
                  <div className="flex gap-1 p-1 bg-muted rounded-xl" role="group" aria-label={t("training.calendarViewToggleAria")}>
                    {calendarOptions.map((option) => {
                      const isActive = calendarView === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${isActive ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
                          aria-pressed={isActive}
                          aria-label={t("training.calendarViewOptionAria", { view: option.label })}
                          onClick={() => {
                            setCalendarView(option.value as typeof calendarView);
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {activePlanError ? (
                <div className="status-card status-card--warning" style={{ marginBottom: 12 }}>
                  <div className="inline-actions-sm">
                    <Icon name="warning" />
                    <strong>{activePlanError}</strong>
                  </div>
                </div>
              ) : null}

              {!planStartDate ? (
                <div className="calendar-empty">
                  <div className="empty-state">
                    <h3 className="m-0">{t("training.calendarStartDateTitle")}</h3>
                    <p className="muted">{t("training.calendarStartDateSubtitle")}</p>
                    <Button onClick={handleSetStartDate}>
                      {t("training.calendarStartDateCta")}
                    </Button>
                  </div>
                  <div className="list-grid">
                    {visiblePlan?.days.map((day, dayIdx) => {
                      return (
                      <details key={`${day.label}-${dayIdx}`} className="accordion-card">
                        <summary>
                          <span>{t("training.dayLabel")} {day.label}</span>
                          <span className="muted">
                            {day.focus} · {day.duration} {t("training.minutesLabel")}
                          </span>
                        </summary>
                        <div className="list-grid mt-12">
                          {day.exercises.map((exercise, exerciseIdx) => {
                            const exerciseId = getExerciseIdentifier(exercise);
                            const exerciseHref = exerciseId ? buildExerciseTechniqueHref(exerciseId) : null;
                            return (
                              <button
                                key={`${exercise.name}-${exerciseIdx}`}
                                type="button"
                                className={`exercise-mini-card ${exerciseHref ? "is-clickable" : "is-disabled"}`}
                                data-testid="training-plan-exercise-item"
                                aria-label={`${t("training.exerciseLink")}: ${exercise.name}`}
                                aria-pressed={false}
                                aria-disabled={!exerciseHref}
                                disabled={!exerciseHref}
                                onClick={() => exerciseHref && router.push(exerciseHref)}
                              >
                                <ExerciseThumbnail
                                  className="exercise-thumb"
                                  src={getExerciseImageUrl(exercise)}
                                  alt={exercise.name}
                                  width={72}
                                  height={72}
                                />
                                <div className="exercise-mini-top">
                                  <strong>{exercise.name}</strong>
                                  {exerciseHref ? <Icon name="chevron-down" size={18} className="exercise-item-chevron" /> : null}
                                </div>
                                <span className="muted">
                                  {exercise.reps ? `${exercise.sets} x ${exercise.reps}` : exercise.sets}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </details>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  {calendarView === "week" ? (
                    <div className="calendar-week">
                      <div className="calendar-range calendar-range--compact training-week-nav">
                        <button
                          type="button"
                          className="btn secondary training-week-nav-arrow"
                          aria-label={t("calendar.previousWeekAria")}
                          onClick={() => setSelectedDate((prev) => clampDateNotBefore(addWeeks(prev, -1), normalizedPlanStartDate))}
                          disabled={!canGoPrevWeek}
                        >
                          <Icon name="chevron-left" size={16} />
                        </button>
                        <div className="training-week-nav-center" aria-live="polite">
                          <strong>
                            {t("training.weekLabel")} {displayWeekNumber}
                          </strong>
                          <span className="muted">{weekDates[0]?.toLocaleDateString(localeCode, { month: "short", day: "numeric" }) ?? weekStart.toLocaleDateString(localeCode, { month: "short", day: "numeric" })} → {weekDates[weekDates.length - 1]?.toLocaleDateString(localeCode, { month: "short", day: "numeric" }) ?? addDays(weekStart, 6).toLocaleDateString(localeCode, { month: "short", day: "numeric" })}</span>
                        </div>
                        <button
                          type="button"
                          className="btn secondary training-week-nav-arrow"
                          aria-label={t("calendar.nextWeekAria")}
                          onClick={() => setSelectedDate((prev) => addWeeks(prev, 1))}
                          disabled={weekOffset >= maxProjectedWeeksAhead}
                        >
                          <Icon name="chevron-right" size={16} />
                        </button>
                      </div>
                      {projectedWeek.isReplicated ? <Badge variant="muted" className="mt-2 fit-content">{t("plan.replicatedWeekLabel")}</Badge> : null}
                      <div className="training-week-strip">
                        {weekDates.map((date) => {
                          const entry = visibleDayMap.get(toDateKey(date));
                          const isSelected = isSameDay(date, selectedDate);
                          const state = entry ? (completedDayKeys.has(toDateKey(date)) ? "done" : "planned") : "rest";
                          return (
                            <button
                              key={toDateKey(date)}
                              type="button"
                              className={`training-week-pill state-${state} ${isSameDay(date, today) ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`}
                              onClick={() => {
                                setSelectedDate(date);
                              }}
                            >
                              <span className="training-week-pill-label">{date.toLocaleDateString(localeCode, { weekday: "short" })}</span>
                              <div className="training-week-pill-icon" aria-hidden="true">
                                {state === "done" ? "✓" : state === "planned" ? "○" : "-"}
                              </div>
                              <span className="training-week-pill-date">{date.getDate()}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {calendarView === "month" ? (
                    <div className="calendar-month">
                      <div className="calendar-range">
                        <strong>{monthLabel}</strong>
                      </div>
                      <div className="calendar-month-grid">
                        {monthDates.map((date, index) => {
                          if (!date) {
                            return <div key={`empty-${index}`} className="calendar-month-cell is-hidden" aria-hidden="true" />;
                          }
                          const entry = visibleDayMap.get(toDateKey(date));
                          const isCurrentMonth = date.getMonth() === clampedSelectedDate.getMonth();
                          return (
                            <button
                              key={toDateKey(date)}
                              type="button"
                              className={`calendar-month-cell ${isCurrentMonth ? "" : "is-muted"} ${entry ? "has-plan" : ""} ${isSameDay(date, today) ? "is-today" : ""}`}
                              onClick={() => {
                                setSelectedDate(date);
                              }}
                            >
                              <span>{date.getDate()}</span>
                              {entry ? <span className="calendar-dot" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {calendarView === "list" ? (
                    <div className="calendar-agenda">
                      {visiblePlanEntries.map((entry) => (
                        <button
                          key={`${entry.day.label}-${toDateKey(entry.date)}`}
                          type="button"
                          className="calendar-agenda-item"
                          onClick={() => {
                            setSelectedDate(entry.date);
                          }}
                        >
                          <div>
                            <strong>{entry.date.toLocaleDateString(localeCode, { weekday: "short", day: "numeric", month: "short" })}</strong>
                            <p className="muted">{entry.day.focus}</p>
                          </div>
                          <span className="badge">{entry.day.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </section>

              <section className="card premium-surface-card surface-content-card training-weekly-section training-weekly-section--day">
                <div className="section-head">
                  <div>
                    <h2 className="section-title section-title-sm">{safeT("training.dayExercisesTitle", "Ejercicios del dia")}</h2>
                    <p className="section-subtitle">{selectedEntryDateLabel}</p>
                  </div>
                </div>
                <div className="exercise-list compact-exercise-list">
                  {selectedExercises.length === 0 ? (
                    <div className="stack-sm">
                      <p className="m-0 font-medium text-primary">{safeT("training.restDayTitle", "Descanso")}</p>
                      <p className="muted m-0">{safeT("training.restDaySubtitle", "Hoy prioriza recuperacion activa, movilidad suave o una caminata corta.")}</p>
                    </div>
                  ) : (
                    selectedExercises.map((exercise, index) => {
                      const exerciseId = getExerciseIdentifier(exercise);
                      const exerciseHref = exerciseId ? buildExerciseTechniqueHref(exerciseId) : null;
                      return (
                        <button
                          key={`${exercise.name}-${index}`}
                          type="button"
                          className={`exercise-mini-card exercise-mini-card-compact ${exerciseHref ? "is-clickable" : "is-disabled"}`}
                          data-testid="training-plan-exercise-item"
                          aria-label={`${t("training.exerciseLink")}: ${exercise.name}`}
                          aria-pressed={false}
                          aria-disabled={!exerciseHref}
                          disabled={!exerciseHref}
                          onClick={() => exerciseHref && router.push(exerciseHref)}
                        >
                          <ExerciseThumbnail
                            className="exercise-thumb"
                            src={getExerciseImageUrl(exercise)}
                            alt={exercise.name}
                            width={72}
                            height={72}
                          />
                          <div className="exercise-mini-copy">
                            <strong className="exercise-mini-name">{exercise.name}</strong>
                            <span className="exercise-mini-meta">{exercise.reps ? `${exercise.sets} x ${exercise.reps}` : exercise.sets}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
              </div>

            </>
          ) : null}

          {hasPlan && (
            <aside className="training-layout-insights">
              <section className="card premium-surface-card surface-content-card training-insights-card">
                <Link
                  href={selectedPlanId ? `/app/biblioteca/entrenamientos?planId=${encodeURIComponent(selectedPlanId)}` : "/app/biblioteca/entrenamientos"}
                  className="training-insight-link training-insight-link--with-affordance"
                >
                  <div className="training-insight-link-icon">
                    <Icon name="book" size={20} />
                  </div>
                  <div>
                    <strong className="training-insight-title">Tus planes</strong>
                    <p className="muted">Gestiona tu plan activo.</p>
                    <p className="training-plan-access-status">
                      {activePlan?.title ? `Actual: ${activePlan.title}` : "Sin plan activo"}
                    </p>
                  </div>
                </Link>
              </section>

              <section className="card premium-surface-card surface-content-card training-insights-card">
                <button
                  type="button"
                  className="training-insight-link"
                  onClick={handleGenerateClick}
                  disabled={isAiDisabled}
                  title={isAiLocked ? aiLockDescription : ""}
                >
                  <div className="training-insight-link-icon is-accent">
                    <Icon name="sparkles" size={20} />
                  </div>
                  <div>
                    <strong>{safeT("training.generateAi", "Generar con IA")}</strong>
                    <p className="muted">{safeT("training.aiSidebarCopy", "Crea un plan personalizado con inteligencia artificial.")}</p>
                  </div>
                </button>
              </section>

              <section className="card premium-surface-card surface-content-card training-insights-card">
                <Link href="/app/biblioteca/entrenamientos" className="training-insight-link">
                  <div className="training-insight-link-icon">
                    <Icon name="book" size={20} />
                  </div>
                  <div>
                    <strong>{safeT("training.exerciseLibrary", "Biblioteca de entrenamientos")}</strong>
                    <p className="muted">{safeT("training.exerciseLibraryCopy", "Explora rutinas y ejercicios guardados.")}</p>
                  </div>
                </Link>
              </section>

              <section className="card premium-surface-card surface-content-card training-insights-card">
                <div className="training-stats-grid">
                  <div className="training-stat-box">
                    <strong>{estimatedCompletedSessions}</strong>
                    <span>{safeT("training.completedShort", "Completados")}</span>
                  </div>
                  <div className="training-stat-box">
                    <strong>{Math.max(totalPlannedSessions - estimatedCompletedSessions, 0)}</strong>
                    <span>{safeT("training.pendingShort", "Pendientes")}</span>
                  </div>
                </div>
              </section>

              <section className="card premium-surface-card surface-content-card training-insights-card">
              <div className="section-head">
                <div>
                  <h2 className="section-title section-title-sm">{t("training.periodTitle")}</h2>
                  <p className="section-subtitle">{t("training.periodSubtitle")}</p>
                </div>
              </div>
              <div className="mesocycle-grid">
                {periodization.map((week, idx) => (
                  <div key={`${week.label}-${idx}`} className="feature-card feature-card--compact mesocycle-card">
                    <span className="badge">{t("training.weekLabel")} {idx + 1}</span>
                    <strong>{t(`training.${week.label}`)}</strong>
                    <p className="muted">{t(`training.${week.detailKey}`)}</p>
                  </div>
                ))}
              </div>
              </section>
            </aside>
          )}

          {!loading && !error && hasPlan ? trainingPlanDetails : null}
        </>
      ) : null}

      {isManualView ? (
        <section className="card">
          <div className="section-head">
            <div>
              <h2 className="section-title section-title-sm">{t("training.manualPlanTitle")}</h2>
              <p className="section-subtitle">{t("training.manualPlanSubtitle")}</p>
            </div>
            <div className="inline-actions-sm">
              <button type="button" className="btn secondary" onClick={() => visiblePlan && setManualPlan(visiblePlan)}>
                {t("training.manualPlanReset")}
              </button>
              <button type="button" className="btn" disabled={!manualPlan || saving} onClick={handleSaveManualPlan}>
                {saving ? t("training.savePlanSaving") : t("training.manualPlanSave")}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="muted">{t("training.profileLoading")}</p>
          ) : error ? (
            <p className="muted">{error}</p>
          ) : saveMessage ? (
            <p className="muted">{saveMessage}</p>
          ) : null}

          {manualPlan ? (
            <div className="form-stack">
              {manualPlan.days.map((day, dayIndex) => (
                <div key={`manual-day-${dayIndex}`} className="feature-card feature-card--compact stack-md">
                  <div className="inline-grid-2">
                    <div className="inline-actions-sm" style={{ gridColumn: "1 / -1", justifyContent: "space-between" }}>
                      <button type="button" className="btn secondary" onClick={addManualDay} disabled={!canManageManualDays}>
                        {t("training.manualDayAdd")}
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => removeManualDay(dayIndex)}
                        disabled={!canManageManualDays || manualPlan.days.length <= 1}
                      >
                        {t("training.manualDayRemove")}
                      </button>
                    </div>
                    {!canManageManualDays ? <p className="muted" style={{ gridColumn: "1 / -1" }}>{t("training.manualDayControlsUnavailable")}</p> : null}
                    <label className="form-stack">
                      {t("training.manualDayLabel")}
                      <input
                        value={day.label}
                        onChange={(e) => updateManualDay(dayIndex, "label", e.target.value)}
                      />
                    </label>
                    <label className="form-stack">
                      {t("training.manualDayFocus")}
                      <input
                        value={day.focus}
                        onChange={(e) => updateManualDay(dayIndex, "focus", e.target.value)}
                      />
                    </label>
                    <label className="form-stack">
                      {t("training.manualDayDuration")}
                      <input
                        type="number"
                        min={20}
                        max={120}
                        value={day.duration}
                        onChange={(e) => updateManualDay(dayIndex, "duration", Number(e.target.value))}
                      />
                    </label>
                  </div>
                  <div className="form-stack">
                    {day.exercises.length === 0 ? (
                      <p className="muted">{t("training.manualExercisesEmpty")}</p>
                    ) : (
                      day.exercises.map((exercise, exerciseIndex) => (
                        <div
                          key={`manual-exercise-${dayIndex}-${exerciseIndex}`}
                          className="training-manual-row"
                        >
                          <input
                            value={exercise.name}
                            onChange={(e) => updateManualExercise(dayIndex, exerciseIndex, "name", e.target.value)}
                            placeholder={t("training.manualExerciseName")}
                          />
                          <input
                            value={exercise.sets}
                            onChange={(e) => updateManualExercise(dayIndex, exerciseIndex, "sets", e.target.value)}
                            placeholder={t("training.manualExerciseSets")}
                          />
                          <input
                            value={exercise.reps ?? ""}
                            onChange={(e) => updateManualExercise(dayIndex, exerciseIndex, "reps", e.target.value)}
                            placeholder={t("training.manualExerciseReps")}
                          />
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => removeManualExercise(dayIndex, exerciseIndex)}
                          >
                            {t("training.manualExerciseRemove")}
                          </button>
                        </div>
                      ))
                    )}
                    <button type="button" className="btn secondary" onClick={() => addManualExercise(dayIndex)}>
                      {t("training.manualExerciseAdd")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">{t("training.manualPlanEmpty")}</p>
          )}
        </section>
      ) : null}



      <Modal
        open={aiLoading}
        onClose={() => undefined}
        title={safeT("training.aiGeneratingTitle", "Estamos generando tu plan")}
        description={safeT(
          "training.aiGeneratingDescription",
          "Esto puede tardar unos segundos. Estamos personalizando tu rutina para mejorar adherencia y resultados."
        )}
      >
        <div className="stack-sm" aria-live="polite" aria-busy="true">
          <div className="inline-actions-sm">
            <span className="ui-spinner" aria-hidden="true" />
            <strong>{safeT("training.aiGeneratingStatus", "Generando plan con IA...")}</strong>
          </div>
          <p className="muted m-0">{safeT("training.aiGeneratingHint", "No cierres esta pantalla. Te mostraremos una vista previa antes de guardar.")}</p>
        </div>
      </Modal>

      <AiTokensExhaustedModal
        open={tokensExhaustedModalOpen}
        onClose={() => setTokensExhaustedModalOpen(false)}
        title={t("ai.tokensExhaustedTitle")}
        description={t("ai.tokensExhaustedDescription")}
        body={t("ai.insufficientTokens")}
        closeLabel={t("ui.close")}
        ctaLabel={t("billing.manageBilling")}
      />

      <ExercisePlanDetailModal
        open={Boolean(exerciseDetail)}
        onClose={closeExerciseDetail}
        title={exerciseDetail?.exercise.name ?? safeT("training.exerciseDetailTitle", "Detalle del ejercicio")}
        description={exerciseDetail ? exerciseDetail.date.toLocaleDateString(localeCode, { weekday: "long", day: "numeric", month: "short" }) : undefined}
        exercise={exerciseDetail?.exercise ?? null}
        imageUrl={exerciseDetail ? getExerciseImageUrl(exerciseDetail.exercise) : null}
        prescriptionLabel={safeT("training.exerciseDetailPrescription", "Prescripción")}
        notesLabel={safeT("training.exerciseDetailNotes", "Notas")}
        emptyNotesLabel={safeT("training.exerciseDetailEmpty", "Sin detalle adicional para este ejercicio.")}
        viewLibraryLabel={safeT("training.viewTechnique", "Ver en biblioteca")}
        viewLibraryHref={detailExerciseId ? buildExerciseTechniqueHref(detailExerciseId) : null}
      />

      <AiPlanPreviewModal
        open={Boolean(aiPreviewPlan)}
        plan={aiPreviewPlan}
        title={t("training.aiPreviewTitle")}
        description={t("training.aiPreviewSubtitle")}
        cancelLabel={t("training.aiPreviewCancel")}
        confirmLabel={t("training.aiPreviewConfirm")}
        savingLabel={t("training.aiPreviewConfirming")}
        durationUnit={t("training.minutesLabel")}
        aiBlockTitle={t("nutrition.aiSuccessModal.aiBlockTitle")}
        tokensUsedLabel={t("nutrition.aiSuccessModal.tokensUsed")}
        promptTokensLabel={t("nutrition.aiSuccessModal.promptTokens")}
        completionTokensLabel={t("nutrition.aiSuccessModal.completionTokens")}
        aiRequestIdLabel={t("nutrition.aiSuccessModal.aiRequestId")}
        remainingBalanceLabel={t("nutrition.aiSuccessModal.currentBalance")}
        notAvailableLabel={t("nutrition.aiSuccessModal.notAvailable")}
        usage={lastGeneratedUsage}
        aiRequestId={lastGeneratedAiRequestId}
        remainingBalance={resultBalancePlaceholder}
        onClose={() => setAiPreviewPlan(null)}
        onConfirm={handleConfirmAiPlan}
        isSaving={aiConfirmSaving}
      />
    </div>
  );
}
