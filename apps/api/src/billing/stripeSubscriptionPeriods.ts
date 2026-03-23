export type StripeSubscriptionItemPeriodLike = {
  current_period_end?: number | null;
};

export type StripeSubscriptionPeriodLike = {
  current_period_end?: number | null;
  items?: {
    data?: StripeSubscriptionItemPeriodLike[];
  } | null;
};

export function getStripeSubscriptionPeriodEnd(
  subscription?: StripeSubscriptionPeriodLike | null,
) {
  const subscriptionPeriodEnd = subscription?.current_period_end;
  if (typeof subscriptionPeriodEnd === "number" && subscriptionPeriodEnd > 0) {
    return new Date(subscriptionPeriodEnd * 1000);
  }

  const itemPeriodEnds = (subscription?.items?.data ?? [])
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number" && value > 0);

  if (itemPeriodEnds.length === 0) {
    return null;
  }

  return new Date(Math.max(...itemPeriodEnds) * 1000);
}
