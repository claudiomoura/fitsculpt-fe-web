import * as crypto from "node:crypto";
import type { SubscriptionPlan } from "@prisma/client";
import { getEnv } from "../config.js";
import { createHttpError } from "./http-utils.js";

const env = getEnv();

// ============================================================================
// Stripe Types
// ============================================================================

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  customer?: string | null;
  subscription?: string | null;
};

export type StripePortalSession = {
  id: string;
  url: string;
};

export type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  current_period_end: number | null;
  items?: { data?: StripeSubscriptionItem[] };
};

export type StripeSubscriptionItem = {
  current_period_end?: number | null;
  price?: {
    id?: string | null;
  } | null;
};

export type StripeInvoiceLineItem = {
  price?: {
    id?: string | null;
  } | null;
};

export type StripeInvoice = {
  id: string;
  customer?: string | null;
  subscription?: string | null;
  lines?: { data?: StripeInvoiceLineItem[] };
};

export type StripeSubscriptionList = {
  data: StripeSubscription[];
};

export type StripeCustomer = {
  id: string;
};

export type StripeProduct = {
  id: string;
  name?: string | null;
};

export type StripePrice = {
  id: string;
  currency: string;
  unit_amount: number | null;
  recurring?: {
    interval?: string | null;
  } | null;
  product?: string | StripeProduct | null;
};

export type StripeInterval = "day" | "week" | "month" | "year" | "unknown";

// ============================================================================
// Stripe Configuration
// ============================================================================

export function requireStripeSecret(): string {
  if (!env.STRIPE_SECRET_KEY) {
    throw createHttpError(500, "STRIPE_NOT_CONFIGURED");
  }
  return env.STRIPE_SECRET_KEY;
}

export function requireStripeWebhookSecret(): string {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw createHttpError(500, "STRIPE_WEBHOOK_NOT_CONFIGURED");
  }
  return env.STRIPE_WEBHOOK_SECRET;
}

// ============================================================================
// Stripe Request Helper
// ============================================================================

export async function stripeRequest<T>(
  path: string,
  params: Record<string, string | number | null | undefined>,
  options?: { method?: "POST" | "GET"; idempotencyKey?: string },
): Promise<T> {
  const secret = requireStripeSecret();
  const method = options?.method ?? "POST";
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
  const url = `https://api.stripe.com/v1/${path}`;
  const queryString = query.toString();
  const response = await fetch(
    method === "GET" && queryString ? `${url}?${queryString}` : url,
    {
      method,
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        ...(options?.idempotencyKey
          ? { "Idempotency-Key": options.idempotencyKey }
          : {}),
      },
      body: method === "GET" ? undefined : queryString,
    },
  );
  if (!response.ok) {
    const errorBody = await response.text();
    throw createHttpError(502, "STRIPE_REQUEST_FAILED", {
      status: response.status,
      body: errorBody,
    });
  }
  return (await response.json()) as T;
}

// ============================================================================
// Stripe Webhook Signature Verification
// ============================================================================

export function verifyStripeSignature(
  rawBody: Buffer,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSec = 300,
) {
  const parts = signatureHeader.split(",").map((p) => p.trim());

  const tPart = parts.find((p) => p.startsWith("t="));
  const tValue = tPart?.slice(2);
  if (!tValue)
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE", {
      reason: "missing_t",
    });

  const timestamp = Number(tValue);
  if (!Number.isFinite(timestamp)) {
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE", {
      reason: "invalid_t",
    });
  }

  // Stripe puede mandar VARIOS v1=...
  const v1Signatures = parts
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3))
    .filter(Boolean);

  if (v1Signatures.length === 0) {
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE", {
      reason: "missing_v1",
    });
  }

  // Tolerancia de tiempo
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestamp) > toleranceSec) {
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE", {
      reason: "timestamp_out_of_tolerance",
      nowSec,
      timestamp,
      toleranceSec,
    });
  }

  const signedPayload = `${tValue}.${rawBody.toString("utf8")}`;
  const expectedHex = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");
  const expectedBuf = Buffer.from(expectedHex, "hex");

  const matchesAny = v1Signatures.some((sig) => {
    if (!/^[0-9a-f]+$/i.test(sig)) return false;
    const sigBuf = Buffer.from(sig, "hex");
    return (
      sigBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(sigBuf, expectedBuf)
    );
  });

  if (!matchesAny) {
    throw createHttpError(400, "INVALID_STRIPE_SIGNATURE");
  }
}

// ============================================================================
// Stripe Billing Helpers
// ============================================================================

export function getStripePricePlanMap(): Map<string, SubscriptionPlan> {
  const prices = [
    { priceId: env.STRIPE_PRO_PRICE_ID, plan: "PRO" as const },
    {
      priceId: env.STRIPE_PRICE_STRENGTH_AI_MONTHLY,
      plan: "STRENGTH_AI" as const,
    },
    { priceId: env.STRIPE_PRICE_NUTRI_AI_MONTHLY, plan: "NUTRI_AI" as const },
  ];
  const missing = prices
    .filter((entry) => !entry.priceId)
    .map((entry) => entry.plan);
  if (missing.length > 0) {
    throw createHttpError(500, "STRIPE_PRICE_NOT_CONFIGURED", {
      missingPlans: missing,
    });
  }
  return new Map(prices.map((entry) => [entry.priceId!, entry.plan]));
}

export function resolvePlanByPriceId(priceId: string): SubscriptionPlan | null {
  return getStripePricePlanMap().get(priceId) ?? null;
}

export function resolvePriceIdByPlanKey(planKey: string): string | null {
  const normalizedPlanKey = planKey.trim().toUpperCase();
  const normalizedToPlan = new Map<string, SubscriptionPlan>([
    ["PRO", "PRO"],
    ["STRENGTH", "STRENGTH_AI"],
    ["STRENGTH_AI", "STRENGTH_AI"],
    ["NUTRI", "NUTRI_AI"],
    ["NUTRI_AI", "NUTRI_AI"],
  ]);
  const plan = normalizedToPlan.get(normalizedPlanKey);
  if (!plan) return null;
  const planEntry = getAvailableBillingPlans().find(
    (entry) => entry.plan === plan,
  );
  return planEntry?.priceId ?? null;
}

export function getAvailableBillingPlans() {
  const plans = [
    { plan: "PRO" as const, priceId: env.STRIPE_PRO_PRICE_ID },
    {
      plan: "STRENGTH_AI" as const,
      priceId: env.STRIPE_PRICE_STRENGTH_AI_MONTHLY,
    },
    { plan: "NUTRI_AI" as const, priceId: env.STRIPE_PRICE_NUTRI_AI_MONTHLY },
  ];

  return plans.filter(
    (entry): entry is (typeof plans)[number] & { priceId: string } =>
      typeof entry.priceId === "string",
  );
}

export function parseStripeAmount(price: StripePrice): number | null {
  if (typeof price.unit_amount !== "number") return null;
  return price.unit_amount / 100;
}

export function normalizeStripeInterval(price: StripePrice): StripeInterval {
  const interval = price.recurring?.interval;
  if (
    interval === "day" ||
    interval === "week" ||
    interval === "month" ||
    interval === "year"
  ) {
    return interval;
  }
  return "unknown";
}

export function isStripeCredentialError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const anyError = error as Error & {
    code?: string;
    debug?: { status?: number };
  };
  return (
    anyError.code === "STRIPE_REQUEST_FAILED" &&
    (anyError.debug?.status === 401 || anyError.debug?.status === 403)
  );
}

export async function resolveStripePlanTitle(
  price: StripePrice,
  fallbackPlan: SubscriptionPlan,
): Promise<string> {
  if (
    price.product &&
    typeof price.product === "object" &&
    typeof price.product.name === "string" &&
    price.product.name.trim()
  ) {
    return price.product.name;
  }

  if (typeof price.product === "string") {
    try {
      const stripeProduct = await stripeRequest<StripeProduct>(
        `products/${price.product}`,
        {},
        { method: "GET" },
      );
      if (typeof stripeProduct.name === "string" && stripeProduct.name.trim()) {
        return stripeProduct.name;
      }
    } catch {
      return fallbackPlan;
    }
  }

  return fallbackPlan;
}