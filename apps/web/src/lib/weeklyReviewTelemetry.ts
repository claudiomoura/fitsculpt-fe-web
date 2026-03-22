"use client";

import { trackEvent } from "@/lib/analytics";
import type { WeeklyReviewRecommendation } from "@/types/weeklyReview";

export type WeeklyReviewTelemetryEvent =
  | { event: "weekly_review_opened"; timestamp: string; weekKey?: string }
  | {
      event: "recommendation_seen";
      timestamp: string;
      weekKey: string;
      recommendationId: WeeklyReviewRecommendation["id"];
      recommendationType: WeeklyReviewRecommendation["type"];
    }
  | {
      event: "adjustment_accepted" | "adjustment_rejected";
      timestamp: string;
      weekKey: string;
      recommendationId: WeeklyReviewRecommendation["id"];
      recommendationType: WeeklyReviewRecommendation["type"];
    };

const STORAGE_KEY = "fitsculpt.weeklyReview.events";

function readStoredEvents(): WeeklyReviewTelemetryEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === "object") as WeeklyReviewTelemetryEvent[];
  } catch {
    return [];
  }
}

export function trackWeeklyReviewEvent(event: WeeklyReviewTelemetryEvent): void {
  if (typeof window === "undefined") return;

  const next = [...readStoredEvents(), event].slice(-50);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("fitsculpt:weekly-review-telemetry", { detail: event }));

  if (event.event === "weekly_review_opened") {
    trackEvent("weekly_review_opened", { origin: "weekly_review", weekKey: event.weekKey });
    return;
  }

  if (event.event === "recommendation_seen") {
    trackEvent("recommendation_seen", {
      origin: "weekly_review",
      recommendationId: event.recommendationId,
      recommendationType: event.recommendationType,
      weekKey: event.weekKey,
    });
    return;
  }

  trackEvent(event.event, {
    origin: "weekly_review",
    recommendationId: event.recommendationId,
    recommendationType: event.recommendationType,
    weekKey: event.weekKey,
  });
}

export function getWeeklyReviewTelemetryStorageKey(): string {
  return STORAGE_KEY;
}
