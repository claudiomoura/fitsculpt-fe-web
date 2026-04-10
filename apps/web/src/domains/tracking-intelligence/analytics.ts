import { trackEvent } from "@/lib/analytics";
import type {
  TrackingIntelligenceCapabilityId,
  TrackingIntelligenceCapabilityStatus,
} from "@/domains/tracking-intelligence/contracts";

type TrackingCapabilityAnalyticsEvent =
  | "computed"
  | "viewed"
  | "fallback"
  | "cta_clicked"
  | "ai_preflight_blocked";

export function trackTrackingCapabilityEvent(input: {
  event: TrackingCapabilityAnalyticsEvent;
  capabilityId: TrackingIntelligenceCapabilityId;
  origin: string;
  status?: TrackingIntelligenceCapabilityStatus;
  analysisMode?: "deterministic_fallback" | "ai_augmented" | "ai_blocked";
  confidence?: "low" | "medium" | "high";
  fallbackLabel?: string | null;
  ctaTarget?: string;
}): void {
  if (input.event === "computed") {
    trackEvent("tracking_intelligence_capability_computed", {
      capabilityId: input.capabilityId,
      capabilityOrigin: input.origin,
      capabilityStatus: input.status,
      capabilityAnalysisMode: input.analysisMode,
      capabilityConfidence: input.confidence,
    });
    return;
  }

  if (input.event === "viewed") {
    trackEvent("tracking_intelligence_capability_viewed", {
      capabilityId: input.capabilityId,
      capabilityOrigin: input.origin,
      capabilityStatus: input.status,
      capabilityAnalysisMode: input.analysisMode,
      capabilityConfidence: input.confidence,
    });
    return;
  }

  if (input.event === "fallback") {
    trackEvent("tracking_intelligence_capability_fallback", {
      capabilityId: input.capabilityId,
      capabilityOrigin: input.origin,
      capabilityStatus: input.status,
      capabilityFallbackLabel: input.fallbackLabel ?? undefined,
    });
    return;
  }

  if (input.event === "cta_clicked") {
    trackEvent("tracking_intelligence_capability_cta_clicked", {
      capabilityId: input.capabilityId,
      capabilityOrigin: input.origin,
      capabilityCtaTarget: input.ctaTarget,
      capabilityStatus: input.status,
    });
    return;
  }

  trackEvent("tracking_intelligence_ai_preflight_blocked", {
    capabilityId: input.capabilityId,
    capabilityOrigin: input.origin,
    capabilityStatus: input.status,
    capabilityAnalysisMode: input.analysisMode,
  });
}
