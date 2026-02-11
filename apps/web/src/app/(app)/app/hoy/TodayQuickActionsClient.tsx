"use client";

import { useEffect, useMemo, useState } from "react";
import QuickActionsGrid, { type TodayQuickAction } from "@/components/today/QuickActionsGrid";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageProvider";

type TrackingStatus = "loading" | "ready" | "error";

export default function TodayQuickActionsClient() {
  const { t } = useLanguage();
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("loading");

  useEffect(() => {
    let active = true;
    const loadTracking = async () => {
      setTrackingStatus("loading");
      try {
        const response = await fetch("/api/tracking", { cache: "no-store", credentials: "include" });
        if (!response.ok) throw new Error("TRACKING_ERROR");
        if (active) setTrackingStatus("ready");
      } catch {
        if (active) setTrackingStatus("error");
      }
    };

    void loadTracking();
    return () => {
      active = false;
    };
  }, []);

  const actions = useMemo<TodayQuickAction[]>(() => {
    const checkinAction: TodayQuickAction = {
      id: "checkin",
      title: t("quickActions.checkinTitle"),
      description: t("quickActions.checkinDescription"),
      ctaLabel: t("quickActions.checkinCta"),
      href: trackingStatus === "ready" ? "/app/seguimiento#checkin-entry" : undefined,
      disabledHint:
        trackingStatus === "error" ? t("quickActions.checkinUnavailable") : t("quickActions.checkinLoading"),
    };

    return [
      checkinAction,
      {
        id: "training",
        title: t("quickActions.openTraining"),
        description: t("quickActions.openTrainingDescription"),
        ctaLabel: t("quickActions.open"),
        href: "/app/entrenamiento",
      },
      {
        id: "nutrition",
        title: t("quickActions.openNutrition"),
        description: t("quickActions.openNutritionDescription"),
        ctaLabel: t("quickActions.open"),
        href: "/app/nutricion",
      },
      {
        id: "library",
        title: t("quickActions.openLibrary"),
        description: t("quickActions.openLibraryDescription"),
        ctaLabel: t("quickActions.open"),
        href: "/app/biblioteca",
      },
    ];
  }, [t, trackingStatus]);

  if (trackingStatus === "loading") {
    return (
      <div className="today-actions-grid" aria-busy="true" aria-live="polite">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`quick-action-skeleton-${index}`} className="feature-card today-action-card">
            <div className="stack-sm">
              <Skeleton variant="line" className="w-45" />
              <Skeleton variant="line" className="w-70" />
              <Skeleton variant="line" className="w-60" />
            </div>
            <Skeleton className="today-action-button" />
          </div>
        ))}
      </div>
    );
  }

  return <QuickActionsGrid actions={actions} />;
}
