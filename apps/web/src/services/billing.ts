export type BillingRedirectResponse = {
  url?: string;
};

export async function postBillingCheckout(priceId: string): Promise<Response> {
  return fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ priceId }),
  });
}

export async function postBillingPortal(): Promise<Response> {
  return fetch("/api/billing/portal", { method: "POST" });
}
