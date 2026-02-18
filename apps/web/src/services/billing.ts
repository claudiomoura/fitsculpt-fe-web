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

export async function getBillingPlans(): Promise<Response> {
  return fetch("/api/billing/plans", { cache: "no-store" });
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
