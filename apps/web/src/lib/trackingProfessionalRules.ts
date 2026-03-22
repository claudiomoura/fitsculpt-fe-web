import type { Goal, Sex } from "@/lib/profile";

export type TrackingAnalysisRangeDays = 7 | 30 | 90;

export type TrackingRangeConfig = {
  days: TrackingAnalysisRangeDays;
  label: string;
  windowDays: number;
  trendWeeks: number;
  chartGranularity: "day" | "week";
  analysisTitle: string;
  analysisDetail: string;
  energyDetail: string;
  adherenceDetail: string;
};

export type WeeklyRateZone = {
  goal: Goal | "maintain";
  recommendedMinPct: number;
  recommendedMaxPct: number;
  alertMinPct: number;
  alertMaxPct: number;
  severeMinPct: number;
  severeMaxPct: number;
};

export type WeeklyRateAssessment = {
  status: "on-track" | "watch" | "alert";
  title: string;
  detail: string;
};

export type WaistHipAssessment = {
  status: "low" | "moderate" | "high";
  label: string;
  detail: string;
};

const GOAL_RATE_ZONES: Record<Goal | "maintain", WeeklyRateZone> = {
  cut: {
    goal: "cut",
    recommendedMinPct: -1,
    recommendedMaxPct: -0.25,
    alertMinPct: -1.25,
    alertMaxPct: 0.2,
    severeMinPct: -1.5,
    severeMaxPct: 0.5,
  },
  bulk: {
    goal: "bulk",
    recommendedMinPct: 0.1,
    recommendedMaxPct: 0.4,
    alertMinPct: -0.1,
    alertMaxPct: 0.6,
    severeMinPct: -0.25,
    severeMaxPct: 0.8,
  },
  maintain: {
    goal: "maintain",
    recommendedMinPct: -0.25,
    recommendedMaxPct: 0.25,
    alertMinPct: -0.5,
    alertMaxPct: 0.5,
    severeMinPct: -0.75,
    severeMaxPct: 0.75,
  },
};

const TRACKING_RANGE_CONFIGS: Record<TrackingAnalysisRangeDays, TrackingRangeConfig> = {
  7: {
    days: 7,
    label: "la ultima semana",
    windowDays: 7,
    trendWeeks: 1,
    chartGranularity: "day",
    analysisTitle: "Lectura tactica semanal",
    analysisDetail: "Prioriza variacion reciente, energia/hambre de los ultimos dias y adherencia inmediata.",
    energyDetail: "Promedios tacticos de la ultima semana.",
    adherenceDetail: "Adherencia reciente sobre 7 dias.",
  },
  30: {
    days: 30,
    label: "el ultimo mes",
    windowDays: 14,
    trendWeeks: 5,
    chartGranularity: "week",
    analysisTitle: "Tendencia media mensual",
    analysisDetail: "Agrega cambios semanales para una lectura mas estable de recomposicion y consistencia.",
    energyDetail: "Promedios suavizados sobre 14 dias para evitar ruido diario.",
    adherenceDetail: "Adherencia agregada sobre 30 dias.",
  },
  90: {
    days: 90,
    label: "los ultimos 3 meses",
    windowDays: 28,
    trendWeeks: 13,
    chartGranularity: "week",
    analysisTitle: "Trayectoria global sostenida",
    analysisDetail: "Suaviza mas la lectura para enfatizar direccion global, estabilidad y deriva sostenida.",
    energyDetail: "Promedios suavizados sobre 28 dias para ver la direccion sostenida.",
    adherenceDetail: "Adherencia global sobre 90 dias.",
  },
};

export function getTrackingRangeConfig(rangeDays?: number): TrackingRangeConfig {
  if (rangeDays === 7 || rangeDays === 30 || rangeDays === 90) return TRACKING_RANGE_CONFIGS[rangeDays];
  return TRACKING_RANGE_CONFIGS[30];
}

export function getWeeklyRateZone(goal?: Goal | ""): WeeklyRateZone {
  if (goal === "cut" || goal === "bulk") return GOAL_RATE_ZONES[goal];
  return GOAL_RATE_ZONES.maintain;
}

export function assessWeeklyRate(goal: Goal | "" | undefined, weeklyRatePct: number | null): WeeklyRateAssessment | null {
  if (weeklyRatePct === null || Number.isNaN(weeklyRatePct)) return null;

  const zone = getWeeklyRateZone(goal);

  if (weeklyRatePct >= zone.recommendedMinPct && weeklyRatePct <= zone.recommendedMaxPct) {
    return {
      status: "on-track",
      title: "Ritmo en zona",
      detail:
        zone.goal === "cut"
          ? "La tendencia semanal cae dentro del rango profesional recomendado para una fase de perdida."
          : zone.goal === "bulk"
            ? "La tendencia semanal sube dentro del rango profesional recomendado para una fase de ganancia."
            : "La tendencia semanal se mantiene dentro del margen esperado para mantenimiento.",
    };
  }

  const isSevere = weeklyRatePct < zone.severeMinPct || weeklyRatePct > zone.severeMaxPct;

  if (zone.goal === "cut") {
    if (weeklyRatePct < zone.alertMinPct) {
      return {
        status: isSevere ? "alert" : "watch",
        title: "Perdida demasiado rapida",
        detail: "La tendencia semanal sugiere un deficit agresivo. Revisa recuperacion, hambre y adherencia antes de recortar mas.",
      };
    }
    return {
      status: "watch",
      title: "Perdida fuera de objetivo",
      detail: "La tendencia semanal no esta cayendo en el rango objetivo del cut. Conviene revisar consistencia y ajuste calórico.",
    };
  }

  if (zone.goal === "bulk") {
    if (weeklyRatePct > zone.alertMaxPct) {
      return {
        status: isSevere ? "alert" : "watch",
        title: "Ganancia demasiado rapida",
        detail: "La tendencia semanal supera la zona recomendada para bulk y aumenta el riesgo de deriva en cintura.",
      };
    }
    return {
      status: "watch",
      title: "Ganancia por debajo del objetivo",
      detail: "La tendencia semanal no llega al rango objetivo de bulk. Revisa si el plan se esta cumpliendo con suficiente consistencia.",
    };
  }

  return {
    status: weeklyRatePct < zone.alertMinPct || weeklyRatePct > zone.alertMaxPct ? "alert" : "watch",
    title: "Mantenimiento inestable",
    detail: "La tendencia semanal se aleja del margen esperado para mantenimiento. Observa la consistencia y los cambios de cintura.",
  };
}

export function assessWaistHipRatio(ratio: number | null, sex?: Sex | ""): WaistHipAssessment | null {
  if (ratio === null || Number.isNaN(ratio)) return null;

  if (sex === "male") {
    if (ratio < 0.9) {
      return { status: "low", label: "Lectura favorable", detail: "Para hombre, un ratio por debajo de 0.90 suele ser una senal positiva de distribucion abdominal." };
    }
    if (ratio < 1) {
      return { status: "moderate", label: "Lectura intermedia", detail: "Para hombre, un ratio entre 0.90 y 0.99 sugiere seguir monitorizando la tendencia semanal de cintura." };
    }
    return { status: "high", label: "Lectura alta", detail: "Para hombre, un ratio de 1.00 o superior merece vigilar cintura y ritmo de ganancia." };
  }

  if (sex === "female") {
    if (ratio < 0.8) {
      return { status: "low", label: "Lectura favorable", detail: "Para mujer, un ratio por debajo de 0.80 suele ser una senal positiva de distribucion cintura-cadera." };
    }
    if (ratio < 0.85) {
      return { status: "moderate", label: "Lectura intermedia", detail: "Para mujer, un ratio entre 0.80 y 0.84 invita a seguir observando la tendencia de cintura." };
    }
    return { status: "high", label: "Lectura alta", detail: "Para mujer, un ratio de 0.85 o superior indica vigilar la deriva de cintura en las proximas semanas." };
  }

  if (ratio < 0.85) {
    return { status: "low", label: "Sin referencia por sexo", detail: "El ratio es usable, pero la lectura profesional mejora cuando el perfil tiene sexo configurado." };
  }

  return { status: "moderate", label: "Sin referencia por sexo", detail: "Configurar el sexo en el perfil permite una lectura mas precisa del ratio cintura/cadera." };
}
