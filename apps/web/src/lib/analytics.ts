export type AnalyticsEventName = "today_view" | "today_cta_click";

export type AnalyticsEventProps = {
  target?: "training" | "nutrition" | "checkin";
};

export function trackEvent(name: AnalyticsEventName, props?: AnalyticsEventProps): void {
  void name;
  void props;
  // Requiere implementación: conectar proveedor real de analytics (Segment/PostHog/GA/etc.).
}
