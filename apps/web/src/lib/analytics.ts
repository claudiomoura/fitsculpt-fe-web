export type AnalyticsEventName =
  | "today_view"
  | "today_cta_click"
  | "billing_checkout_started"
  | "billing_checkout_returned"
  | "training_start_clicked"
  | "nutrition_log_opened"
  | "checkin_opened";

export type AnalyticsEventProps = {
  target?: "training" | "nutrition" | "checkin" | "billing";
  origin?: string;
  returnTo?: string;
};

declare global {
  interface Window {
    __fsAnalyticsQueue?: Array<{ name: AnalyticsEventName; props?: AnalyticsEventProps }>;
  }
}

export function trackEvent(name: AnalyticsEventName, props?: AnalyticsEventProps): void {
  if (typeof window === "undefined") return;
  window.__fsAnalyticsQueue = window.__fsAnalyticsQueue ?? [];
  window.__fsAnalyticsQueue.push({ name, props });
}
