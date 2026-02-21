export type BillingRedirectResponse = {
  url?: string;
};

export type BillingPlanPrice = {
  amount: number;
  currency: string;
  interval: string;
};

export type BillingPlanSummary = {
  planKey: string;
  title?: string;
  descriptionKey?: string;
  price: BillingPlanPrice;
  priceId: string;
};

export type BillingPlansResponse = {
  plans?: BillingPlanSummary[];
  warnings?: string[];
  error?: string;
};

type BillingPlansErrorCode = "NO_VALID_PRICES" | "STRIPE_NOT_CONFIGURED" | (string & {});

export type BillingPlansResult =
  | {
      ok: true;
      status: number;
      plans: BillingPlanSummary[];
      warnings: string[];
      body: BillingPlansResponse | BillingPlanSummary[];
    }
  | {
      ok: false;
      reason: "not_available" | "auth" | "error";
      status: number | null;
      errorCode: BillingPlansErrorCode | null;
      warnings: string[];
      body: BillingPlansResponse | BillingPlanSummary[] | null;
    };

const unsupportedBillingEndpoints = new Set<string>();
const BILLING_PLANS_KEY = "GET /api/billing/plans";

function extractWarnings(payload: BillingPlansResponse | BillingPlanSummary[] | null): string[] {
  if (!payload || Array.isArray(payload)) {
    return [];
  }

  return Array.isArray(payload.warnings) ? payload.warnings : [];
}

function extractErrorCode(payload: BillingPlansResponse | BillingPlanSummary[] | null): BillingPlansErrorCode | null {
  if (!payload || Array.isArray(payload) || typeof payload.error !== "string") {
    return null;
  }

  return payload.error as BillingPlansErrorCode;
}

export async function getBillingPlans(): Promise<BillingPlansResult> {
  if (unsupportedBillingEndpoints.has(BILLING_PLANS_KEY)) {
    return {
      ok: false,
      reason: "not_available",
      status: 501,
      errorCode: null,
      warnings: [],
      body: { plans: [] },
    };
  }

  const response = await fetch("/api/billing/plans", { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as BillingPlansResponse | BillingPlanSummary[] | null;
  const warnings = extractWarnings(payload);
  const errorCode = extractErrorCode(payload);

  if (response.status === 404 || response.status === 501) {
    unsupportedBillingEndpoints.add(BILLING_PLANS_KEY);
    return {
      ok: false,
      reason: "not_available",
      status: response.status,
      errorCode,
      warnings,
      body: payload ?? { plans: [] },
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      reason: "auth",
      status: response.status,
      errorCode,
      warnings,
      body: payload,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: "error",
      status: response.status,
      errorCode,
      warnings,
      body: payload,
    };
  }

  const plans = Array.isArray(payload) ? payload : payload?.plans;

  return {
    ok: true,
    status: response.status,
    plans: Array.isArray(plans) ? plans : [],
    warnings,
    body: payload ?? { plans: [] },
  };
}

export async function postBillingCheckout(planKey: string): Promise<Response> {
  return fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ planKey }),
  });
}

export async function postBillingPortal(): Promise<Response> {
  return fetch("/api/billing/portal", { method: "POST" });
}
