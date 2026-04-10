import { readAuthEntitlementSnapshot, type SubscriptionPlan } from "@/context/auth/entitlements";
import { fetchAuthMe } from "@/lib/authDedup";
import type { AuthMeResponse } from "@/lib/types";

export type AiCapabilityId =
  | "tracking-intelligence-body-scan"
  | "tracking-intelligence-projection-explainer"
  | "tracking-intelligence-recommendation"
  | "training-plan-generation"
  | (string & {});

export type AiPreflightFailureReason =
  | "missing_entitlement"
  | "tier_ineligible"
  | "insufficient_balance"
  | "token_estimation_failed"
  | "reservation_failed"
  | "reservation_unavailable";

export type AiEntitlementRequirement = {
  module: "ai" | "nutrition" | "strength";
  minimumPlan?: SubscriptionPlan;
};

export type AiTokenEstimate = {
  estimatedTokens: number;
  source: "static" | "estimator";
};

export type AiTokenReservation = {
  ok: boolean;
  reservationId?: string;
  balanceAfter?: number;
  reason?: string;
};

export type AiCapabilityPreflightContext = {
  profile: AuthMeResponse;
  capability: AiCapabilityId;
  entitlement: ReturnType<typeof readAuthEntitlementSnapshot>;
};

export type AiCapabilityPreflightInput<TPayload = unknown> = {
  capability: AiCapabilityId;
  payload: TPayload;
  profile?: AuthMeResponse | null;
  entitlement: AiEntitlementRequirement;
  estimateTokens: (payload: TPayload, context: AiCapabilityPreflightContext) => number | Promise<number>;
  reserveTokens?: (input: {
    capability: AiCapabilityId;
    estimatedTokens: number;
    profile: AuthMeResponse;
  }) => Promise<AiTokenReservation>;
};

export type AiCapabilityPreflightResult =
  | {
      ok: true;
      capability: AiCapabilityId;
      profile: AuthMeResponse;
      entitlement: ReturnType<typeof readAuthEntitlementSnapshot>;
      estimate: AiTokenEstimate;
      reservation: AiTokenReservation & { ok: true; reservationId: string };
    }
  | {
      ok: false;
      capability: AiCapabilityId;
      profile: AuthMeResponse | null;
      entitlement: ReturnType<typeof readAuthEntitlementSnapshot> | null;
      failureReason: AiPreflightFailureReason;
      estimate: AiTokenEstimate | null;
      message: string;
    };

function hasRequiredPlan(current: SubscriptionPlan, minimumPlan?: SubscriptionPlan): boolean {
  if (!minimumPlan) return true;
  if (minimumPlan === "FREE") return true;
  if (minimumPlan === "PRO") return current === "PRO";
  return current === minimumPlan || current === "PRO";
}

function hasRequiredEntitlement(
  entitlement: ReturnType<typeof readAuthEntitlementSnapshot>,
  requirement: AiEntitlementRequirement,
): boolean {
  return entitlement.aiEntitlements[requirement.module];
}

function buildFailure(
  input: {
    capability: AiCapabilityId;
    profile?: AuthMeResponse | null;
    entitlement?: ReturnType<typeof readAuthEntitlementSnapshot> | null;
    failureReason: AiPreflightFailureReason;
    estimate?: AiTokenEstimate | null;
    message: string;
  },
): AiCapabilityPreflightResult {
  return {
    ok: false,
    capability: input.capability,
    profile: input.profile ?? null,
    entitlement: input.entitlement ?? null,
    failureReason: input.failureReason,
    estimate: input.estimate ?? null,
    message: input.message,
  };
}

export async function runAiCapabilityPreflight<TPayload>(
  input: AiCapabilityPreflightInput<TPayload>,
): Promise<AiCapabilityPreflightResult> {
  const profile = input.profile ?? (await fetchAuthMe().catch(() => null));
  if (!profile) {
    return buildFailure({
      capability: input.capability,
      failureReason: "missing_entitlement",
      message: "No pudimos validar el entitlement AI del usuario.",
    });
  }

  const entitlement = readAuthEntitlementSnapshot(profile);
  if (!hasRequiredEntitlement(entitlement, input.entitlement)) {
    return buildFailure({
      capability: input.capability,
      profile,
      entitlement,
      failureReason: "missing_entitlement",
      message: "La capacidad AI no esta habilitada para este usuario.",
    });
  }

  if (!hasRequiredPlan(entitlement.subscriptionPlan, input.entitlement.minimumPlan)) {
    return buildFailure({
      capability: input.capability,
      profile,
      entitlement,
      failureReason: "tier_ineligible",
      message: "La capacidad AI requiere un tier superior.",
    });
  }

  let estimatedTokens: number;
  try {
    estimatedTokens = await input.estimateTokens(input.payload, {
      profile,
      capability: input.capability,
      entitlement,
    });
  } catch (_error) {
    return buildFailure({
      capability: input.capability,
      profile,
      entitlement,
      failureReason: "token_estimation_failed",
      message: "No pudimos estimar el costo de tokens antes de ejecutar la capacidad AI.",
    });
  }

  const estimate: AiTokenEstimate = {
    estimatedTokens: Math.max(0, Math.ceil(estimatedTokens)),
    source: "estimator",
  };

  if (entitlement.tokenBalance < estimate.estimatedTokens) {
    return buildFailure({
      capability: input.capability,
      profile,
      entitlement,
      estimate,
      failureReason: "insufficient_balance",
      message: "El usuario no tiene saldo suficiente para ejecutar la capacidad AI.",
    });
  }

  if (!input.reserveTokens) {
    return buildFailure({
      capability: input.capability,
      profile,
      entitlement,
      estimate,
      failureReason: "reservation_unavailable",
      message: "La reserva de tokens aun no esta conectada; la ejecucion AI se bloquea por seguridad.",
    });
  }

  const reservation = await input.reserveTokens({
    capability: input.capability,
    estimatedTokens: estimate.estimatedTokens,
    profile,
  });

  if (!reservation.ok || typeof reservation.reservationId !== "string" || reservation.reservationId.length === 0) {
    return buildFailure({
      capability: input.capability,
      profile,
      entitlement,
      estimate,
      failureReason: "reservation_failed",
      message: reservation.reason ?? "No pudimos reservar tokens antes de ejecutar la capacidad AI.",
    });
  }

  return {
    ok: true,
    capability: input.capability,
    profile,
    entitlement,
    estimate,
    reservation: {
      ...reservation,
      ok: true,
      reservationId: reservation.reservationId,
    },
  };
}
