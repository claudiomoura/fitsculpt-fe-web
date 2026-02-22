"use client";

export type WeeklyReviewTelemetryEvent =
  | { event: "weekly_review_opened"; timestamp: string }
  | {
      event: "weekly_review_recommendation_decision";
      timestamp: string;
      recommendationId: string;
      decision: "accepted" | "dismissed";
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
}

export function getWeeklyReviewTelemetryStorageKey(): string {
  return STORAGE_KEY;
}
