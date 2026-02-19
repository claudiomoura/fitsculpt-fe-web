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
};

export type BillingPlansResult =
  | {
      ok: true;
      plans: BillingPlanSummary[];
    }
  | {
      ok: false;
      reason: "not_available" | "error";
      status: number | null;
    };

export async function getBillingPlans(): Promise<BillingPlansResult> {
  const response = await fetch("/api/billing/plans", { cache: "no-store" });

  if (response.status === 404 || response.status === 501) {
    return { ok: false, reason: "not_available", status: response.status };
  }

  if (!response.ok) {
    return { ok: false, reason: "error", status: response.status };
  }

  const payload = (await response.json()) as BillingPlansResponse | BillingPlanSummary[];
  const plans = Array.isArray(payload) ? payload : payload.plans;

  return {
    ok: true,
    plans: Array.isArray(plans) ? plans : [],
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
