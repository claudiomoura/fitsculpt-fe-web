import type { AuthMeResponse } from "@/lib/types";
import type { ProfileData } from "@/lib/profile";
import { runAiCapabilityPreflight, type AiTokenReservation } from "@/domains/ai";
import type {
  TrackingAiAssistState,
  TrackingBodyScanCapability,
  TrackingBodyCompositionEstimate,
  TrackingBodyCompositionEstimateSource,
  TrackingBodyScanInsufficiencyReason,
  TrackingBodyScanPersistenceAdapter,
  TrackingBodyScanPersistenceState,
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
import { getTrackingIntelligenceCompliance } from "@/domains/tracking-intelligence/compliance";

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

function buildNotPersistedState(): TrackingBodyScanPersistenceState {
  return {
    status: "not_persisted",
    adapter: "none",
    record: null,
    errorMessage: null,
  };
}

function roundMetric(value: number | null): number | null {
  if (value === null || Number.isNaN(value)) return null;
  return Number(value.toFixed(1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundPercent(value: number): number {
  return Number(clamp(value, 3, 60).toFixed(1));
}

function toInches(valueCm: number): number {
  return valueCm / 2.54;
}

function hasValidMetric(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function formatEstimateSource(source: TrackingBodyCompositionEstimateSource): string {
  switch (source) {
    case "manual_body_fat":
      return "body fat manual";
    case "us_navy":
      return "medidas tipo Navy";
    case "bmi_age":
      return "perfil corporal base";
  }
}

function estimateNavyBodyFat(profile: ProfileData, weightReference: { waistCm: number; neckCm: number; hipsCm: number }): number | null {
  if (!hasValidMetric(profile.heightCm) || !hasValidMetric(weightReference.waistCm) || !hasValidMetric(weightReference.neckCm)) {
    return null;
  }

  const heightIn = toInches(profile.heightCm);
  const waistIn = toInches(weightReference.waistCm);
  const neckIn = toInches(weightReference.neckCm);

  if (profile.sex === "male") {
    const abdomenDelta = waistIn - neckIn;
    if (abdomenDelta <= 0) return null;
    const estimate = 495 / (1.0324 - 0.19077 * Math.log10(abdomenDelta) + 0.15456 * Math.log10(heightIn)) - 450;
    return roundPercent(estimate);
  }

  if (profile.sex === "female" && hasValidMetric(weightReference.hipsCm)) {
    const hipsIn = toInches(weightReference.hipsCm);
    const compositionDelta = waistIn + hipsIn - neckIn;
    if (compositionDelta <= 0) return null;
    const estimate = 495 / (1.29579 - 0.35004 * Math.log10(compositionDelta) + 0.221 * Math.log10(heightIn)) - 450;
    return roundPercent(estimate);
  }

  return null;
}

function estimateBmiBodyFat(profile: ProfileData, latestWeightKg: number | null): number | null {
  if (!hasValidMetric(profile.heightCm) || !hasValidMetric(latestWeightKg) || !hasValidMetric(profile.age)) {
    return null;
  }

  const heightM = profile.heightCm / 100;
  const bmi = latestWeightKg / (heightM * heightM);
  const sexFactor = profile.sex === "male" ? 1 : 0;
  const estimate = 1.2 * bmi + 0.23 * profile.age - 10.8 * sexFactor - 5.4;
  return roundPercent(estimate);
}

function buildCompositionEstimate(args: {
  profile: ProfileData;
  latestCheckinBodyFatPercent: number | null;
  latestWeightKg: number | null;
  latestWaistCm: number | null;
  latestNeckCm: number | null;
  latestHipsCm: number | null;
  recentCheckinsCount: number;
  photoAvailability: { hasAnyPhoto: boolean; hasFrontPhoto: boolean; hasSidePhoto: boolean };
  passiveSupportDays: number;
}): TrackingBodyCompositionEstimate | null {
  const candidates: Array<{ source: TrackingBodyCompositionEstimateSource; value: number; weight: number }> = [];

  if (hasValidMetric(args.latestCheckinBodyFatPercent)) {
    candidates.push({ source: "manual_body_fat", value: roundPercent(args.latestCheckinBodyFatPercent), weight: 0.58 });
  }

  if (hasValidMetric(args.latestWaistCm) && hasValidMetric(args.latestNeckCm)) {
    const navy = estimateNavyBodyFat(args.profile, {
      waistCm: args.latestWaistCm,
      neckCm: args.latestNeckCm,
      hipsCm: args.latestHipsCm ?? 0,
    });
    if (navy !== null) {
      candidates.push({ source: "us_navy", value: navy, weight: 0.27 });
    }
  }

  const bmi = estimateBmiBodyFat(args.profile, args.latestWeightKg);
  if (bmi !== null) {
    candidates.push({ source: "bmi_age", value: bmi, weight: 0.15 });
  }

  if (candidates.length === 0) return null;

  const weightedSum = candidates.reduce((sum, candidate) => sum + candidate.value * candidate.weight, 0);
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  const center = roundPercent(weightedSum / totalWeight);
  const values = candidates.map((candidate) => candidate.value);
  const disagreement = values.length > 1 ? Math.max(...values) - Math.min(...values) : 0;

  let halfRange = 5.8;
  if (candidates.some((candidate) => candidate.source === "manual_body_fat")) halfRange -= 1.2;
  if (candidates.some((candidate) => candidate.source === "us_navy")) halfRange -= 1;
  if (candidates.some((candidate) => candidate.source === "bmi_age")) halfRange -= 0.5;
  if (args.photoAvailability.hasFrontPhoto && args.photoAvailability.hasSidePhoto) halfRange -= 0.8;
  else if (args.photoAvailability.hasAnyPhoto) halfRange -= 0.3;
  if (args.recentCheckinsCount >= 3) halfRange -= 0.6;
  else if (args.recentCheckinsCount >= 2) halfRange -= 0.3;
  if (args.passiveSupportDays >= 3) halfRange -= 0.4;
  halfRange += disagreement * 0.32;
  halfRange = clamp(halfRange, 2.2, 7);

  const min = roundPercent(center - halfRange);
  const max = roundPercent(center + halfRange);
  const fatMassKg = hasValidMetric(args.latestWeightKg) ? roundMetric(args.latestWeightKg * (center / 100)) : null;
  const leanMassKg = hasValidMetric(args.latestWeightKg) && fatMassKg !== null ? roundMetric(args.latestWeightKg - fatMassKg) : null;

  let confidenceScore = 32;
  if (candidates.some((candidate) => candidate.source === "manual_body_fat")) confidenceScore += 20;
  if (candidates.some((candidate) => candidate.source === "us_navy")) confidenceScore += 16;
  if (candidates.some((candidate) => candidate.source === "bmi_age")) confidenceScore += 8;
  if (args.photoAvailability.hasFrontPhoto && args.photoAvailability.hasSidePhoto) confidenceScore += 10;
  else if (args.photoAvailability.hasAnyPhoto) confidenceScore += 5;
  if (args.recentCheckinsCount >= 3) confidenceScore += 10;
  else if (args.recentCheckinsCount >= 2) confidenceScore += 6;
  if (args.passiveSupportDays >= 3) confidenceScore += 6;
  confidenceScore -= Math.round(disagreement * 2.5);
  confidenceScore = Math.round(clamp(confidenceScore, 20, 92));

  const sources = candidates.map((candidate) => candidate.source);
  const sourceSummary = sources.map(formatEstimateSource).join(", ");
  const accuracyNote =
    candidates.some((candidate) => candidate.source === "manual_body_fat")
      ? `Estimacion hibrida basada en ${sourceSummary}; las fotos sirven como contexto visual, no como medicion clinica.`
      : `Estimacion aproximada basada en ${sourceSummary}; sin una medicion manual reciente el rango se abre mas.`;

  return {
    bodyFatPercent: center,
    bodyFatRangePct: { min, max },
    leanMassKg,
    fatMassKg,
    confidenceScore,
    sources,
    accuracyNote,
  };
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
  const composition = buildCompositionEstimate({
    profile: request.profile,
    latestCheckinBodyFatPercent: latestCheckin?.bodyFatPercent ?? null,
    latestWeightKg: latestCheckin?.weightKg ?? request.profile.weightKg ?? null,
    latestWaistCm: latestCheckin?.waistCm ?? request.profile.measurements.waistCm ?? null,
    latestNeckCm: latestCheckin?.neckCm ?? request.profile.measurements.neckCm ?? null,
    latestHipsCm: latestCheckin?.hipsCm ?? request.profile.measurements.hipsCm ?? null,
    recentCheckinsCount: recentCheckins.length,
    photoAvailability,
    passiveSupportDays,
  });

  const insufficiencies: TrackingBodyScanInsufficiencyReason[] = [];
  if (!photoAvailability.hasAnyPhoto) insufficiencies.push("missing_progress_photos");
  if (!photoAvailability.hasFrontPhoto) insufficiencies.push("missing_front_photo");
  if (!photoAvailability.hasSidePhoto) insufficiencies.push("missing_side_photo");
  if (recentCheckins.length < 2) insufficiencies.push("limited_recent_checkins");
  if (!latestCheckin || latestCheckin.bodyFatPercent <= 0) insufficiencies.push("missing_body_fat");
  if (!latestCheckin || latestCheckin.waistCm <= 0) insufficiencies.push("missing_measurements");
  if (passiveSupport.snapshots.length === 0) insufficiencies.push("missing_passive_support");

  const confidence =
    (composition?.confidenceScore ?? 0) >= 78
      ? "high"
      : (composition?.confidenceScore ?? 0) >= 55 || (recentCheckins.length >= 2 && (photoAvailability.hasAnyPhoto || (latestCheckin?.bodyFatPercent ?? 0) > 0 || (latestCheckin?.waistCm ?? 0) > 0))
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
  if (composition) {
    observations.push(
      `Estimacion central de grasa corporal: ${composition.bodyFatPercent.toFixed(1)}% con rango orientativo ${composition.bodyFatRangePct.min.toFixed(1)}-${composition.bodyFatRangePct.max.toFixed(1)}%.`,
    );
    if (composition.leanMassKg !== null && composition.fatMassKg !== null) {
      observations.push(
        `Con el peso actual, la lectura aproxima ${composition.leanMassKg.toFixed(1)} kg de masa libre de grasa y ${composition.fatMassKg.toFixed(1)} kg de masa grasa.`,
      );
    }
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
  if (!hasValidMetric(request.profile.heightCm)) nextBestInputs.push("Completar la altura del perfil para mejorar la estimacion antropometrica.");
  if (!request.profile.sex) nextBestInputs.push("Configurar el sexo en el perfil para afinar referencias corporales basadas en medidas.");
  if (!hasValidMetric(request.profile.age)) nextBestInputs.push("Completar la edad del perfil para mejorar la estimacion secundaria basada en IMC.");

  let summary = "Tu body scan actual usa una lectura determinista y explicable de fotos, check-ins y soporte reciente.";
  if (state === "insufficient_data") {
    summary = "Todavia no hay datos suficientes para un body scan util; el sistema prioriza pedir mas evidencia antes de inferir cambios corporales.";
  } else if (composition) {
    summary = `Estimacion corporal utilizable: alrededor de ${composition.bodyFatPercent.toFixed(1)}% de grasa, con rango honesto ${composition.bodyFatRangePct.min.toFixed(1)}-${composition.bodyFatRangePct.max.toFixed(1)}% segun tus medidas y registros recientes.`;
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
      composition,
    },
    compliance: getTrackingIntelligenceCompliance("body-scan"),
    persistence: buildNotPersistedState(),
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
    persistenceAdapter?: TrackingBodyScanPersistenceAdapter;
  },
): Promise<TrackingBodyScanCapability> {
  let capability = buildTrackingBodyScanCapability(request);

  if (request.persistenceAdapter) {
    try {
      const record = await request.persistenceAdapter.save({ capability });
      capability = {
        ...capability,
        persistence: {
          status: "persisted",
          adapter: "remote",
          record,
          errorMessage: null,
        },
      };
    } catch (_error) {
      capability = {
        ...capability,
        persistence: {
          status: "persist_failed",
          adapter: "remote",
          record: null,
          errorMessage: "No pudimos persistir el resultado de body scan.",
        },
      };
    }
  }

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
