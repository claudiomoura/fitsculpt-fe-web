"use client";

import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  });

  // Send to PostHog if available
  if (typeof window !== "undefined") {
    const posthog = (window as any).posthog;
    if (posthog && typeof posthog.capture === "function") {
      posthog.capture("web_vitals", {
        metric_name: metric.name,
        value: metric.value,
        rating: metric.rating,
      });
    }
  }

  // Log in development
  if (process.env.NODE_ENV === "development") {
    console.log("[WebVitals]", metric.name, metric.value, metric.rating);
  }

  // Send to analytics endpoint in production
  if (process.env.NODE_ENV === "production") {
    navigator.sendBeacon?.("/api/analytics/web-vitals", body);
  }
}

interface Metric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
}

export default function WebVitals() {
  if (typeof window !== "undefined") {
    onCLS(sendToAnalytics);
    onFCP(sendToAnalytics);
    onINP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  }

  return null;
}
