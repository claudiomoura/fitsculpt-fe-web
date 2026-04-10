import type { AuthMeResponse } from "@/lib/types";
import { runAiCapabilityPreflight, type AiTokenReservation } from "@/domains/ai";
import type {
  TrackingAiAssistState,
  TrackingIntelligenceExplainability,
  TrackingRecommendationCapability,
  TrackingRecommendationCtaTarget,
  TrackingRecommendationItem,
  TrackingRecommendationRequest,
} from "@/domains/tracking-intelligence/contracts";
import { selectTrackingProjectionScenario } from "@/domains/tracking-intelligence/projection";
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

function buildRecommendationExplainability(input: {
  request: TrackingRecommendationRequest;
  canCombineProjectionAndScan: boolean;
  hasProjection: boolean;
  hasBodyScan: boolean;
}): TrackingIntelligenceExplainability {
  const projectionExplainability = input.request.projection?.explainability ?? null;
  const bodyScanSummary = input.request.bodyScan?.summary ?? null;

  if (input.canCombineProjectionAndScan) {
    return {
      sourceStatus: "ready",
      summary: "Recommendation combinada con projection real, body scan y adherence disponibles.",
      rationale: [projectionExplainability?.summary, bodyScanSummary].filter(
        (value): value is string => Boolean(value),
      ),
      fallbackLabel: null,
    };
  }

  if (input.hasProjection) {
    return {
      sourceStatus: "fallback",
      summary: "Recommendation conectada a projection real, pero aun sin body scan robusto en la mezcla.",
      rationale: [
        projectionExplainability?.summary ??
          "Projection aporta el marco principal de decision para esta recomendacion.",
      ],
      fallbackLabel: null,
    };
  }

  if (input.hasBodyScan) {
    return {
      sourceStatus: "fallback",
      summary: "Recommendation degradada a body scan y adherence mientras projection no este disponible.",
      rationale: [
        projectionExplainability?.summary ??
          "Projection no esta disponible; se conserva un fallback explicable y determinista.",
        bodyScanSummary ?? "Body scan aporta el mejor contexto corporal disponible.",
      ],
      fallbackLabel:
        input.request.projection?.explainability?.fallbackLabel ??
        "projection_unavailable",
    };
  }

  return {
    sourceStatus: "unavailable",
    summary: "Recommendation degradada a adherence y recogida de datos base por falta de projection y body scan robustos.",
    rationale: [
      projectionExplainability?.summary ??
        "Sin projection activa, el sistema evita sobreinterpretar datos parciales.",
    ],
    fallbackLabel:
      input.request.projection?.explainability?.fallbackLabel ??
      "projection_unavailable",
  };
}

function buildCta(target: TrackingRecommendationCtaTarget) {
  if (target === "tracking-checkin") {
    return { target, href: "/app/seguimiento/check-in", label: "Completar check-in" };
  }
  if (target === "weekly-review") {
    return { target, href: "/app/weekly-review", label: "Abrir weekly review" };
  }
  if (target === "training-plan") {
    return { target, href: "/app/entrenamientos", label: "Revisar entrenamiento" };
  }
  if (target === "nutrition-plan") {
    return { target, href: "/app/nutricion", label: "Revisar nutricion" };
  }
  return { target, href: "/app/seguimiento", label: "Abrir seguimiento" };
}

function buildItem(input: Omit<TrackingRecommendationItem, "cta"> & { ctaTarget: TrackingRecommendationCtaTarget }): TrackingRecommendationItem {
  return {
    id: input.id,
    title: input.title,
    summary: input.summary,
    rationale: input.rationale,
    confidence: input.confidence,
    sourceCapabilities: input.sourceCapabilities,
    cta: buildCta(input.ctaTarget),
  };
}

export function estimateTrackingRecommendationTokens(request: TrackingRecommendationRequest): number {
  const sourceCount = [request.bodyScan, request.projection, request.adherenceContext].filter(Boolean).length;
  const activityVolume = request.adherenceContext.workoutLog.length + request.adherenceContext.mealLog.length + request.adherenceContext.checkins.length;
  return 110 + sourceCount * 40 + Math.min(activityVolume, 30) * 8;
}

export function buildTrackingRecommendationCapability(request: TrackingRecommendationRequest): TrackingRecommendationCapability {
  const insights = request.adherenceContext.professionalInsights;
  const bodyScan = request.bodyScan ?? null;
  const projection = request.projection?.projection ?? null;
  const selectedProjectionScenario = selectTrackingProjectionScenario({
    projection,
    activeScenarioByHorizon: request.projection?.activeScenarioByHorizon,
    preferredMonths: 3,
  });
  const projectionHorizon = selectedProjectionScenario?.horizon ?? null;
  const currentScenario = selectedProjectionScenario?.scenario ?? null;
  const improvedScenario =
    projectionHorizon?.scenarios.find((entry) => entry.id === "improved-consistency") ?? null;

  const inputMatrix = {
    hasCheckins: request.adherenceContext.checkins.length > 0,
    hasWorkoutLog: request.adherenceContext.workoutLog.length > 0,
    hasMealLog: request.adherenceContext.mealLog.length > 0,
    hasPassiveSupport: request.adherenceContext.passiveSupport.snapshots.length > 0,
    hasBodyScan: Boolean(bodyScan && bodyScan.status === "ready"),
    hasProjection: Boolean(projection && request.projection?.status === "ready"),
    canCombineProjectionAndScan: Boolean(bodyScan && projection && bodyScan.status === "ready" && request.projection?.status === "ready"),
  };

  const items: TrackingRecommendationItem[] = [];

  if (!inputMatrix.hasBodyScan || bodyScan?.state === "insufficient_data") {
    items.push(
      buildItem({
        id: "collect-more-body-scan-data",
        title: "Completa una base minima de body scan",
        summary: "Antes de afinar un programa de transformacion, conviene reunir fotos comparables, cintura y al menos dos check-ins recientes.",
        rationale: [
          bodyScan?.summary ?? "Aun no hay lectura corporal suficiente para interpretar cambios con contexto.",
          "El fallback determinista prioriza calidad de inputs antes que recomendaciones agresivas.",
        ],
        confidence: "medium",
        sourceCapabilities: ["body-scan"],
        ctaTarget: "tracking-checkin",
      }),
    );
  }

  if (insights.combinedAdherencePct < 65 || insights.trainingConsistencyPct < 60) {
    items.push(
      buildItem({
        id: "stabilize-weekly-consistency",
        title: "Estabiliza consistencia antes de escalar el plan",
        summary: "Tu siguiente mejor paso es asegurar una semana mas estable de entrenamiento y logging antes de pedir mas intensidad o complejidad.",
        rationale: [
          `Adherencia combinada actual: ${Math.round(insights.combinedAdherencePct)}%.`,
          `Consistencia de entrenamiento actual: ${Math.round(insights.trainingConsistencyPct)}%.`,
          inputMatrix.hasBodyScan && bodyScan
            ? bodyScan.summary
            : "Sin body scan robusto, la consistencia pesa mas que cualquier lectura corporal aislada.",
        ],
        confidence: inputMatrix.hasCheckins ? "high" : "medium",
        sourceCapabilities: inputMatrix.hasBodyScan ? ["recommendation", "body-scan"] : ["recommendation"],
        ctaTarget: "weekly-review",
      }),
    );
  }

  if (inputMatrix.hasProjection && projectionHorizon && currentScenario) {
    items.push(
      buildItem({
        id: "review-projection-assumptions",
        title: "Usa la proyeccion como marco de decision, no como promesa",
        summary:
          currentScenario.id === "improved-consistency"
            ? `La proyeccion a ${projectionHorizon.months} meses ya refleja el escenario mejorado seleccionado; revisa si puedes sostener esos supuestos.`
            : improvedScenario && currentScenario.expectedDeltaKg.max !== improvedScenario.expectedDeltaKg.max
            ? `La proyeccion a ${projectionHorizon.months} meses mejora si elevas consistencia; vale la pena revisar esos supuestos.`
            : `La proyeccion a ${projectionHorizon.months} meses sirve para validar si el programa actual sigue alineado con tu objetivo.`,
        rationale: [
          `Confianza de la proyeccion: ${projectionHorizon.confidence}.`,
          ...(currentScenario.assumptions.slice(0, 2) ?? []),
          bodyScan?.summary ?? "La recomendacion puede funcionar incluso sin body scan cuando projection aporta un marco suficiente.",
        ],
        confidence: projectionHorizon.confidence === "low" ? "medium" : projectionHorizon.confidence,
        sourceCapabilities: bodyScan ? ["recommendation", "projection", "body-scan"] : ["recommendation", "projection"],
        ctaTarget: "weekly-review",
      }),
    );
  }

  if ((request.profile.goal === "cut" && (insights.weeklyRateKg ?? 0) < -0.9) || (bodyScan?.data.waistDeltaCm ?? 0) > 1.5) {
    items.push(
      buildItem({
        id: "protect-recovery-bandwidth",
        title: "Protege recuperacion y evita sobrecorregir esta semana",
        summary: "Las senales actuales sugieren mantener un ajuste prudente para no confundir fatiga, retencion o ruido de medicion con falta real de progreso.",
        rationale: [
          insights.weeklyRateKg !== null ? `Ritmo semanal estimado: ${insights.weeklyRateKg.toFixed(1)} kg/sem.` : "No hay ritmo semanal suficientemente estable.",
          bodyScan?.data.waistDeltaCm !== null && bodyScan?.data.waistDeltaCm !== undefined
            ? `Cambio de cintura reciente: ${bodyScan.data.waistDeltaCm.toFixed(1)} cm.`
            : "No hay cintura comparable suficiente.",
        ],
        confidence: "medium",
        sourceCapabilities: bodyScan ? ["recommendation", "body-scan"] : ["recommendation"],
        ctaTarget: "training-plan",
      }),
    );
  }

  if (items.length === 0) {
    items.push(
      buildItem({
        id: "maintain-current-course",
        title: "Mantener el curso actual con seguimiento ligero",
        summary: "La combinacion disponible de adherence y tracking no muestra una bandera clara; lo mas razonable es sostener la base y volver a revisar en la siguiente ventana.",
        rationale: [
          `Adherencia combinada actual: ${Math.round(insights.combinedAdherencePct)}%.`,
          inputMatrix.hasProjection
            ? "La proyeccion actual no obliga a un cambio fuerte inmediato."
            : "La recomendacion se apoya en adherence y tracking sin projection disponible.",
        ],
        confidence: inputMatrix.hasCheckins ? "medium" : "low",
        sourceCapabilities: bodyScan ? ["recommendation", "body-scan"] : ["recommendation"],
        ctaTarget: "tracking-overview",
      }),
    );
  }

  const limitedItems = items.slice(0, Math.max(1, request.maxItems ?? 3));
  const summary =
    inputMatrix.canCombineProjectionAndScan
      ? "Recommendation modular combinando projection, body scan y adherence signals."
      : inputMatrix.hasProjection
        ? "Recommendation modular basada en projection y adherence disponibles."
        : inputMatrix.hasBodyScan
          ? "Recommendation modular basada en body scan y adherence disponibles."
          : "Recommendation modular degradada a adherence y recogida de datos base.";
  const explainability = buildRecommendationExplainability({
    request,
    canCombineProjectionAndScan: inputMatrix.canCombineProjectionAndScan,
    hasProjection: inputMatrix.hasProjection,
    hasBodyScan: inputMatrix.hasBodyScan,
  });

  return {
    capability: "recommendation",
    status: limitedItems.length > 0 ? "ready" : "missing_data",
    origin: request.origin,
    errorMessage: null,
    analysisMode: "deterministic_fallback",
    summary,
    inputMatrix,
    items: limitedItems,
    deterministicFallbackUsed: true,
    compliance: getTrackingIntelligenceCompliance("recommendation"),
    aiAssist: buildAiAssistNotRequested(),
    explainability,
  };
}

export async function loadTrackingRecommendationCapability(
  request: TrackingRecommendationRequest & {
    preferAi?: boolean;
    aiProfile?: AuthMeResponse | null;
    reserveTokens?: ((input: {
      capability: "tracking-intelligence-recommendation";
      estimatedTokens: number;
      profile: AuthMeResponse;
    }) => Promise<AiTokenReservation>) | undefined;
  },
): Promise<TrackingRecommendationCapability> {
  const capability = buildTrackingRecommendationCapability(request);

  if (!request.preferAi) {
    return capability;
  }

  const preflight = await runAiCapabilityPreflight({
    capability: "tracking-intelligence-recommendation",
    payload: request,
    profile: request.aiProfile,
    entitlement: { module: "ai", minimumPlan: "PRO" },
    estimateTokens: estimateTrackingRecommendationTokens,
    reserveTokens: request.reserveTokens
      ? async ({ estimatedTokens, profile }) =>
          request.reserveTokens?.({
            capability: "tracking-intelligence-recommendation",
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
