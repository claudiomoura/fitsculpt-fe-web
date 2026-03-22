import posthog from "posthog-js";

export type AnalyticsEventName =
  | "onboarding_completed"
  | "today_view"
  | "today_cta_click"
  | "billing_checkout_started"
  | "billing_checkout_returned"
  | "upgrade_started"
  | "payment_success"
  | "training_start_clicked"
  | "workout_started"
  | "workout_completed"
  | "nutrition_log_opened"
  | "checkin_opened"
  | "checkin_saved"
  | "nutrition_meal_logged"
  | "meal_logged"
  | "quick_log_opened"
  | "quick_log_saved"
  | "voice_log_used"
  | "barcode_lookup_used"
  | "weekly_review_opened"
  | "adjustment_accepted"
  | "adjustment_rejected"
  | "recommendation_seen";

export type AnalyticsEventProps = {
  target?: "training" | "nutrition" | "checkin" | "billing";
  mode?: "quick" | "full";
  mealType?: string;
  origin?: string;
  returnTo?: string;
  recommendationId?: string;
  recommendationType?: string;
  weekKey?: string;
  decision?: string;
};

declare global {
  interface Window {
    __fsAnalyticsQueue?: Array<{ name: AnalyticsEventName; props?: AnalyticsEventProps }>;
  }
}

let analyticsEnabled = false;
let analyticsInitialized = false;

export function initAnalytics() {
  if (typeof window === "undefined" || analyticsInitialized) return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) {
    analyticsInitialized = true;
    analyticsEnabled = false;
    return;
  }

  posthog.init(apiKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    person_profiles: "identified_only",
    autocapture: false,
    persistence: "localStorage+cookie",
    loaded: () => {
      analyticsEnabled = true;
    },
  });

  analyticsInitialized = true;
}

export function identifyAnalyticsUser(user: { id?: string | null; email?: string | null; subscriptionPlan?: string | null; plan?: string | null } | null) {
  if (!analyticsInitialized || !analyticsEnabled || !user?.id) return;
  posthog.identify(user.id, {
    email: user.email ?? undefined,
    subscription_plan: user.subscriptionPlan ?? user.plan ?? undefined,
  });
}

export function resetAnalyticsUser() {
  if (!analyticsInitialized || !analyticsEnabled) return;
  posthog.reset();
}

export function trackEvent(name: AnalyticsEventName, props?: AnalyticsEventProps): void {
  if (typeof window === "undefined") return;
  window.__fsAnalyticsQueue = window.__fsAnalyticsQueue ?? [];
  window.__fsAnalyticsQueue.push({ name, props });

  if (analyticsInitialized && analyticsEnabled) {
    posthog.capture(name, props ?? {});
  }
}
