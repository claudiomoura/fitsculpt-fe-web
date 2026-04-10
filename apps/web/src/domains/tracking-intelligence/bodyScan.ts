import type { AuthMeResponse } from "@/lib/types";
import { runAiCapabilityPreflight, type AiTokenReservation } from "@/domains/ai";
import type {
  TrackingAiAssistState,
  TrackingBodyScanCapability,
  TrackingBodyScanInsufficiencyReason,
  TrackingBodyScanRequest,
} from "@/domains/tracking-intelligence/contracts";
import {
  selectCheckinsInTrendWindow,
  selectLatestTrackingCheckin,
  selectPassiveSupportSnapshot,
  selectTrackingAnalysisCheckins,
  selectTrackingPhotoAvailability,
  selectTrackingPhotoComparison,
} from "@/domains/tracking-intelligence/selectors";

const BODY_SCAN_COMPLIANCE = {
  disclaimer:
    "Esta lectura orienta seguimiento fisico con tus datos actuales. No ofrece diagnostico medico ni promete precision visual hiperrealista.",
  limitations: [
    "La confianza baja si faltan fotos comparables, check-ins recientes o medidas consistentes.",
    "Las fotos pueden ayudar a contextualizar cambios, pero no sustituyen mediciones estandarizadas.",
    "La version actual prioriza señales deterministas y explicables mientras el modelo AI final sigue pendiente.",
  ],
  safetyNotes: [
    "Usa el resultado para ajustar seguimiento, no para sacar conclusiones clinicas.",
    "Si hay dolor, cambios bruscos o dudas de salud, consulta a un profesional.",
  ],
  medicalAccuracy: "not_medical_advice",
  visualAccuracy: "not_hyperrealistic",
} as const;

function buildAiAssistBlocked(message: string, failureReason: string | null, estimatedTokens: number | null): TrackingAiAssistState {
  return {
    status: "blocked",
    failureReason,
    message,
    estimatedTokens,
    reservationId: null,
  };
}

function buildAiAssistNotRequested(): TrackingAiAssistState {
  return {
    status: "not_requested",
    failureReason: null,
    message: null,
    estimatedTokens: null,
    reservationId: null,
  };
}

function roundMetric(value: number | null): number | null {
  if (value === null || Number.isNaN(value)) return null;
  return Number(value.toFixed(1));
}

export function estimateTrackingBodyScanTokens(request: TrackingBodyScanRequest): number {
  const recentCheckins = Math.max(1, request.checkins.length);
  const photoCount = request.checkins.reduce(
    (count, entry) => count + (entry.frontPhotoUrl ? 1 : 0) + (entry.sidePhotoUrl ? 1 : 0),
    0,
  );
  return 120 + recentCheckins * 18 + photoCount * 60;
}

export function buildTrackingBodyScanCapability(request: TrackingBodyScanRequest): TrackingBodyScanCapability {
  const rangeDays = Math.max(7, request.rangeDays ?? 30);
  const analysisCheckins = selectTrackingAnalysisCheckins(request.checkins, request.profile);
  const sortedCheckins = [...analysisCheckins].sort((a, b) => b.date.localeCompare(a.date));
  const recentCheckins = selectCheckinsInTrendWindow(sortedCheckins, rangeDays);
  const latestCheckin = selectLatestTrackingCheckin(request.checkins, request.profile);
  const photoComparison = selectTrackingPhotoComparison(sortedCheckins);
  const photoAvailability = selectTrackingPhotoAvailability(photoComparison.current ?? latestCheckin);
  const passiveSupport = selectPassiveSupportSnapshot(request.passiveData, rangeDays);

  const oldestRecentCheckin = recentCheckins[recentCheckins.length - 1] ?? null;
  const weightDeltaKg =
    latestCheckin && oldestRecentCheckin && recentCheckins.length >= 2
      ? roundMetric(latestCheckin.weightKg - oldestRecentCheckin.weightKg)
      : null;
  const waistDeltaCm =
    latestCheckin && oldestRecentCheckin && recentCheckins.length >= 2 && oldestRecentCheckin.waistCm > 0
      ? roundMetric(latestCheckin.waistCm - oldestRecentCheckin.waistCm)
      : null;
  const bodyFatDeltaPct =
    latestCheckin && oldestRecentCheckin && recentCheckins.length >= 2 && oldestRecentCheckin.bodyFatPercent > 0
      ? roundMetric(latestCheckin.bodyFatPercent - oldestRecentCheckin.bodyFatPercent)
      : null;

  const passiveSupportDays = passiveSupport.snapshots.filter(
    (entry) => (entry.activeMinutes ?? 0) >= 20 || (entry.steps ?? 0) >= 7000,
  ).length;

  const insufficiencies: TrackingBodyScanInsufficiencyReason[] = [];
  if (!photoAvailability.hasAnyPhoto) insufficiencies.push("missing_progress_photos");
  if (!photoAvailability.hasFrontPhoto) insufficiencies.push("missing_front_photo");
  if (!photoAvailability.hasSidePhoto) insufficiencies.push("missing_side_photo");
  if (recentCheckins.length < 2) insufficiencies.push("limited_recent_checkins");
  if (!latestCheckin || latestCheckin.bodyFatPercent <= 0) insufficiencies.push("missing_body_fat");
  if (!latestCheckin || latestCheckin.waistCm <= 0) insufficiencies.push("missing_measurements");
  if (passiveSupport.snapshots.length === 0) insufficiencies.push("missing_passive_support");

  const confidence =
    recentCheckins.length >= 3 && photoAvailability.hasFrontPhoto && photoAvailability.hasSidePhoto && (latestCheckin?.bodyFatPercent ?? 0) > 0 && (latestCheckin?.waistCm ?? 0) > 0
      ? "high"
      : recentCheckins.length >= 2 && (photoAvailability.hasAnyPhoto || (latestCheckin?.bodyFatPercent ?? 0) > 0 || (latestCheckin?.waistCm ?? 0) > 0)
        ? "medium"
        : "low";

  const state =
    recentCheckins.length === 0 && !photoAvailability.hasAnyPhoto && (latestCheckin?.bodyFatPercent ?? 0) <= 0
      ? "insufficient_data"
      : confidence === "low"
        ? "low_confidence"
        : "ready";

  const status = state === "insufficient_data" ? "missing_data" : "ready";

  const observations: string[] = [];
  if (weightDeltaKg !== null) {
    observations.push(
      weightDeltaKg < 0
        ? `El peso reciente baja ${Math.abs(weightDeltaKg).toFixed(1)} kg en la ventana analizada.`
        : weightDeltaKg > 0
          ? `El peso reciente sube ${weightDeltaKg.toFixed(1)} kg en la ventana analizada.`
          : "El peso reciente se mantiene bastante estable en la ventana analizada.",
    );
  }
  if (waistDeltaCm !== null) {
    observations.push(
      waistDeltaCm < 0
        ? `La cintura muestra una bajada de ${Math.abs(waistDeltaCm).toFixed(1)} cm.`
        : waistDeltaCm > 0
          ? `La cintura sube ${waistDeltaCm.toFixed(1)} cm y conviene revisar adherencia y contexto.`
          : "La cintura permanece estable en los registros comparables.",
    );
  }
  if (bodyFatDeltaPct !== null) {
    observations.push(
      bodyFatDeltaPct < 0
        ? `El porcentaje graso estimado baja ${Math.abs(bodyFatDeltaPct).toFixed(1)} puntos.`
        : bodyFatDeltaPct > 0
          ? `El porcentaje graso estimado sube ${bodyFatDeltaPct.toFixed(1)} puntos; hay que interpretar el dato con cautela.`
          : "El porcentaje graso estimado no cambia de forma clara.",
    );
  }
  if (photoComparison.totalEntriesWithPhotos >= 2) {
    observations.push("Hay fotos comparables de progreso para contextualizar tendencia, aunque la lectura visual sigue siendo orientativa.");
  } else if (photoAvailability.hasAnyPhoto) {
    observations.push("Hay una foto reciente, pero falta una comparativa consistente para leer cambios visuales con mas contexto.");
  }
  if (passiveSupport.snapshots.length > 0) {
    observations.push(
      passiveSupportDays >= Math.max(2, Math.round(rangeDays / 10))
        ? `El soporte pasivo muestra ${passiveSupportDays} dias con actividad util para respaldar la lectura.`
        : "El soporte pasivo existe, pero aun es escaso para reforzar la interpretacion.",
    );
  }
  if (observations.length === 0) {
    observations.push("Todavia no hay suficientes señales cruzadas para una lectura corporal con contexto util.");
  }

  const nextBestInputs: string[] = [];
  if (!photoAvailability.hasFrontPhoto) nextBestInputs.push("Subir una foto frontal con postura y luz similares a la ultima referencia.");
  if (!photoAvailability.hasSidePhoto) nextBestInputs.push("Subir una foto lateral para mejorar la lectura de silueta y comparacion.");
  if (recentCheckins.length < 2) nextBestInputs.push("Registrar al menos dos check-ins comparables dentro de 2-4 semanas.");
  if (!latestCheckin || latestCheckin.bodyFatPercent <= 0) nextBestInputs.push("Completar una estimacion de body fat para complementar peso y cintura.");
  if (!latestCheckin || latestCheckin.waistCm <= 0) nextBestInputs.push("Registrar cintura u otra medida corporal para reducir ambiguedad del peso.");
  if (passiveSupport.snapshots.length === 0) nextBestInputs.push("Sincronizar pasos, actividad o sueno para reforzar el contexto de recuperacion.");

  let summary = "Tu body scan actual usa una lectura determinista y explicable de fotos, check-ins y soporte reciente.";
  if (state === "insufficient_data") {
    summary = "Todavia no hay datos suficientes para un body scan util; el sistema prioriza pedir mas evidencia antes de inferir cambios corporales.";
  } else if (request.profile.goal === "cut" && (weightDeltaKg ?? 0) < 0 && (waistDeltaCm ?? 0) <= 0) {
    summary = "Las senales disponibles apuntan a progreso compatible con una fase de perdida de grasa, aunque la certeza depende de mantener fotos y mediciones consistentes.";
  } else if (request.profile.goal === "bulk" && (weightDeltaKg ?? 0) > 0 && (waistDeltaCm ?? 0) <= 1) {
    summary = "Las senales disponibles encajan con una fase de ganancia controlada, pero todavia conviene vigilar cintura y recuperacion para validar calidad del progreso.";
  } else if (confidence === "low") {
    summary = "Hay algunas senales utiles, pero la confianza sigue baja porque faltan referencias comparables o densidad de seguimiento.";
  }

  return {
    capability: "body-scan",
    status,
    origin: request.origin,
    errorMessage: null,
    state,
    confidence,
    analysisMode: "deterministic_fallback",
    summary,
    observations,
    nextBestInputs,
    insufficiencies,
    data: {
      latestCheckin,
      recentCheckinsCount: recentCheckins.length,
      photoComparison,
      photoAvailability,
      passiveSupportDays,
      weightDeltaKg,
      waistDeltaCm,
      bodyFatDeltaPct,
    },
    compliance: BODY_SCAN_COMPLIANCE,
    aiAssist: buildAiAssistNotRequested(),
  };
}

export async function loadTrackingBodyScanCapability(
  request: TrackingBodyScanRequest & {
    preferAi?: boolean;
    aiProfile?: AuthMeResponse | null;
    reserveTokens?: ((input: {
      capability: "tracking-intelligence-body-scan";
      estimatedTokens: number;
      profile: AuthMeResponse;
    }) => Promise<AiTokenReservation>) | undefined;
  },
): Promise<TrackingBodyScanCapability> {
  const capability = buildTrackingBodyScanCapability(request);

  if (!request.preferAi) {
    return capability;
  }

  const preflight = await runAiCapabilityPreflight({
    capability: "tracking-intelligence-body-scan",
    payload: request,
    profile: request.aiProfile,
    entitlement: { module: "ai", minimumPlan: "PRO" },
    estimateTokens: estimateTrackingBodyScanTokens,
    reserveTokens: request.reserveTokens
      ? async ({ estimatedTokens, profile }) =>
          request.reserveTokens?.({
            capability: "tracking-intelligence-body-scan",
            estimatedTokens,
            profile,
          }) ?? { ok: false, reason: "missing_reservation" }
      : undefined,
  });

  if (!preflight.ok) {
    return {
      ...capability,
      analysisMode: "ai_blocked",
      aiAssist: buildAiAssistBlocked(
        preflight.message,
        preflight.failureReason,
        preflight.estimate?.estimatedTokens ?? null,
      ),
    };
  }

  return {
    ...capability,
    analysisMode: "ai_augmented",
    aiAssist: {
      status: "ready",
      failureReason: null,
      message: null,
      estimatedTokens: preflight.estimate.estimatedTokens,
      reservationId: preflight.reservation.reservationId,
    },
  };
}
