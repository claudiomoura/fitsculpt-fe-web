type StripeRequestFailureError = Error & {
  code?: string;
  debug?: {
    status?: number;
    body?: string;
  };
};

function parseStripeErrorBody(body: string | undefined): { code?: string; message?: string } | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as { error?: { code?: string; message?: string } };
    return parsed.error ?? null;
  } catch {
    return null;
  }
}

export function isStripePriceNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const stripeError = error as StripeRequestFailureError;
  if (stripeError.code !== "STRIPE_REQUEST_FAILED") return false;

  const stripeBodyError = parseStripeErrorBody(stripeError.debug?.body);
  const message = (stripeBodyError?.message ?? "").toLowerCase();

  return (
    stripeError.debug?.status === 404
    && (stripeBodyError?.code === "resource_missing" || message.includes("no such price"))
  );
}

