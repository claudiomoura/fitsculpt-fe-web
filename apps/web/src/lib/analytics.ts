import posthog from "posthog-js";

export type AnalyticsEventName =
  | "landing_view"
  | "pricing_view"
  | "pricing_hero_variant_exposed"
  | "pricing_hero_cta_click"
  | "pricing_hero_variant_cta_click"
  | "hero_cta_click"
  | "plan_cta_click"
  | "checkout_start_register_click"
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
  | "quick_log_photo_analysis_started"
  | "quick_log_photo_analysis_success"
  | "quick_log_photo_analysis_error"
  | "voice_log_used"
  | "barcode_lookup_used"
  | "weekly_review_opened"
  | "adjustment_accepted"
  | "adjustment_rejected"
  | "recommendation_seen"
  | "future_projection_viewed"
  | "future_projection_scenario_selected"
  | "rct_status_viewed"
  | "rct_summary_viewed"
  | "gym_join_cta_clicked"
  | "tracking_intelligence_capability_computed"
  | "tracking_intelligence_capability_viewed"
  | "tracking_intelligence_capability_fallback"
  | "tracking_intelligence_capability_cta_clicked"
  | "tracking_intelligence_ai_preflight_blocked";

export type AnalyticsEventProps = {
  planId?: string;
  planName?: string;
  target?: "training" | "nutrition" | "checkin" | "billing" | "planes";
  mode?: "quick" | "full";
  mealType?: string;
  origin?: string;
  returnTo?: string;
  recommendationId?: string;
  recommendationType?: string;
  weekKey?: string;
  decision?: string;
  rctGroup?: "control" | "treatment";
  horizonMonths?: number;
  scenarioId?: string;
  windowDays?: number;
  confidence?: number;
  itemsCount?: number;
  fallbackReason?: string | null;
  code?: string;
  capabilityId?: "body-scan" | "projection" | "recommendation";
  capabilityOrigin?: string;
  capabilityStatus?: string;
  capabilityAnalysisMode?: string;
  capabilityConfidence?: string;
  capabilityFallbackLabel?: string;
  capabilityCtaTarget?: string;
  variant?: "control" | "focus";
  abTest?: "on" | "off";
};

declare global {
  interface Window {
    __fsAnalyticsQueue?: Array<{ name: AnalyticsEventName; props?: AnalyticsEventProps }>;
    posthog?: typeof posthog;
  }
}

let analyticsEnabled = false;
let analyticsInitialized = false;

const POSTHOG_INGEST_HOST = "https://us.i.posthog.com";
const POSTHOG_SESSION_BOOT_KEY = "fs_posthog_boot_event_sent";

export function resolvePostHogHost(host: string | undefined): string {
  const normalized = host?.trim().replace(/\/+$/, "");

  if (!normalized) {
    return POSTHOG_INGEST_HOST;
  }

  if (normalized === "https://app.posthog.com") {
    return POSTHOG_INGEST_HOST;
  }

  if (normalized === "https://eu.posthog.com") {
    return "https://eu.i.posthog.com";
  }

  return normalized;
}

function resolveRuntimeSurface() {
  if (typeof window === "undefined") return "server";

  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes("capacitor") || userAgent.includes("fitsculpt") || userAgent.includes(" wv")
    ? "native-webview"
    : "web";
}

function captureBootEvent() {
  if (typeof window === "undefined") return;

  try {
    if (window.sessionStorage.getItem(POSTHOG_SESSION_BOOT_KEY) === "1") {
      return;
    }

    posthog.capture("app_opened", {
      app_env: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "unknown",
      surface: resolveRuntimeSurface(),
      path: window.location.pathname,
    });

    window.sessionStorage.setItem(POSTHOG_SESSION_BOOT_KEY, "1");
  } catch {
    posthog.capture("app_opened", {
      app_env: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "unknown",
      surface: resolveRuntimeSurface(),
      path: typeof window === "undefined" ? undefined : window.location.pathname,
    });
  }
}

export function initAnalytics() {
  if (typeof window === "undefined" || analyticsInitialized) return;

  if (window.navigator.webdriver) {
    analyticsInitialized = true;
    analyticsEnabled = false;
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) {
    analyticsInitialized = true;
    analyticsEnabled = false;
    return;
  }

  const apiHost = resolvePostHogHost(process.env.NEXT_PUBLIC_POSTHOG_HOST);
  window.posthog = posthog;

  posthog.init(apiKey, {
    api_host: apiHost,
    capture_pageview: true,
    capture_pageleave: true,
    person_profiles: "identified_only",
    autocapture: false,
    persistence: "localStorage+cookie",
    loaded: () => {
      analyticsEnabled = true;
      window.posthog = posthog;
      captureBootEvent();
      // Flush any events queued before PostHog initialized
      const queue = window.__fsAnalyticsQueue;
      if (queue?.length) {
        for (const event of queue) {
          posthog.capture(event.name, event.props ?? {});
        }
        window.__fsAnalyticsQueue = [];
      }
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
