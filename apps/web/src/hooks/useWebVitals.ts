"use client";

import { useEffect } from "react";
import { onCLS, onINP, onLCP, onFCP, onTTFB, Metric } from "web-vitals";

function sendToAnalytics(metric: Metric) {
  const name = metric.name;
  const value = Math.round(metric.value);
  const rating = metric.rating;

  console.log(`[Web Vitals] ${name}: ${value}ms (${rating})`);
  
  if (typeof window !== "undefined" && window.__fsAnalyticsQueue) {
    import("posthog-js").then((posthogModule) => {
      const posthog = posthogModule.default || posthogModule;
      posthog.capture("web_vital", {
        name,
        value,
        rating,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });
  }

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.setTag(`web_vital.${name}`, value);
      Sentry.setTag(`web_vital.${name}.rating`, rating ?? "unknown");
    });
  }
}

export function useWebVitals() {
  useEffect(() => {
    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  }, []);
}
