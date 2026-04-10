import { getFutureProjection, getRctStatus } from "@/services/futureProjection";
import type {
  FutureProjectionHorizon,
  FutureProjectionResponse,
  FutureProjectionScenario,
  RctStatusResponse,
} from "@/types/futureProjection";
import type {
  TrackingIntelligenceExplainability,
  TrackingProjectionCapability,
  TrackingRecommendationRequest,
} from "@/domains/tracking-intelligence/contracts";

export type TrackingProjectionCapabilityResult = TrackingProjectionCapability & {
  projection: FutureProjectionResponse | null;
  rctStatus: RctStatusResponse | null;
  activeScenarioByHorizon: Record<number, string>;
};

type TrackingProjectionScenarioSelection = {
  horizon: FutureProjectionHorizon;
  scenario: FutureProjectionScenario;
};

function buildProjectionUnavailableExplainability(message: string): TrackingIntelligenceExplainability {
  return {
    sourceStatus: "unavailable",
    summary: message,
    rationale: [
      "Los consumers deben degradar a adherence y body scan mientras projection no este disponible.",
    ],
    fallbackLabel: "projection_unavailable",
  };
}

export function selectTrackingProjectionScenario(input: {
  projection: FutureProjectionResponse | null;
  activeScenarioByHorizon?: Record<number, string> | null;
  preferredMonths?: FutureProjectionHorizon["months"];
}): TrackingProjectionScenarioSelection | null {
  const horizons = input.projection?.horizons ?? [];
  if (horizons.length === 0) {
    return null;
  }

  const preferredHorizon =
    horizons.find((entry) => entry.months === (input.preferredMonths ?? 3)) ??
    horizons[0];
  const activeScenarioId = input.activeScenarioByHorizon?.[preferredHorizon.months];
  const scenario =
    preferredHorizon.scenarios.find((entry) => entry.id === activeScenarioId) ??
    preferredHorizon.scenarios[0];

  if (!scenario) {
    return null;
  }

  return { horizon: preferredHorizon, scenario };
}

function buildTrackingProjectionExplainability(input: {
  status: TrackingProjectionCapabilityResult["status"];
  projection: FutureProjectionResponse | null;
  activeScenarioByHorizon: Record<number, string>;
  errorMessage: string | null;
}): TrackingIntelligenceExplainability {
  if (input.status === "error") {
    return buildProjectionUnavailableExplainability(
      input.errorMessage ?? "No pudimos cargar projection ahora mismo.",
    );
  }

  const selection = selectTrackingProjectionScenario({
    projection: input.projection,
    activeScenarioByHorizon: input.activeScenarioByHorizon,
    preferredMonths: 3,
  });

  if (!selection) {
    return {
      sourceStatus: "fallback",
      summary: "Projection aun no tiene horizontes utilizables; recommendation debe apoyarse en otras senales.",
      rationale: [
        "Sin escenarios activos no hay marco proyectivo suficiente para empujar cambios de programa.",
      ],
      fallbackLabel: "projection_missing_data",
    };
  }

  return {
    sourceStatus: "ready",
    summary: `Projection lista con horizonte principal a ${selection.horizon.months} meses en escenario ${selection.scenario.label.toLowerCase()}.`,
    rationale: [
      `Confianza ${selection.horizon.confidence}.`,
      ...selection.scenario.assumptions.slice(0, 2),
    ],
    fallbackLabel: null,
  };
}

export function toTrackingRecommendationProjectionInput(
  capability: TrackingProjectionCapabilityResult | null,
): TrackingRecommendationRequest["projection"] {
  if (!capability) {
    return null;
  }

  return {
    status: capability.status,
    projection: capability.projection,
    rctStatus: capability.rctStatus,
    activeScenarioByHorizon: capability.activeScenarioByHorizon,
    explainability: capability.explainability,
  };
}

export async function loadTrackingProjectionCapability(origin = "unknown"): Promise<TrackingProjectionCapabilityResult> {
  const [projectionResult, statusResult] = await Promise.all([
    getFutureProjection(),
    getRctStatus(),
  ]);

  if (!projectionResult.ok || !statusResult.ok) {
    const errorMessage = "No pudimos cargar tu proyeccion futura ahora mismo.";
    return {
      capability: "projection",
      status: "error",
      origin,
      errorMessage,
      explainability: buildProjectionUnavailableExplainability(errorMessage),
      projection: null,
      rctStatus: null,
      activeScenarioByHorizon: {},
    };
  }

  const status = projectionResult.data.horizons.length > 0 ? "ready" : "missing_data";
  const activeScenarioByHorizon = Object.fromEntries(
    projectionResult.data.horizons.map((horizon) => [
      horizon.months,
      horizon.scenarios[0]?.id ?? "current-consistency",
    ]),
  );

  return {
    capability: "projection",
    status,
    origin,
    errorMessage: null,
    explainability: buildTrackingProjectionExplainability({
      status,
      projection: projectionResult.data,
      activeScenarioByHorizon,
      errorMessage: null,
    }),
    projection: projectionResult.data,
    rctStatus: statusResult.data,
    activeScenarioByHorizon,
  };
}
