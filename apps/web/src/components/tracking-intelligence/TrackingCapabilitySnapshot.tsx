"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { defaultProfile, type ProfileData } from "@/lib/profile";
import { fetchTrackingSnapshotDeduped } from "@/lib/trackingDedup";
import {
  buildTrackingBodyScanCapability,
  buildTrackingRecommendationCapability,
  loadTrackingProjectionCapability,
  selectTrackingAdherenceContext,
  toTrackingRecommendationProjectionInput,
  type TrackingProjectionCapabilityResult,
} from "@/domains/tracking-intelligence";
import type {
  CheckinEntry,
  MealLogEntry,
  PassiveHealthData,
  WorkoutEntry,
} from "@/services/tracking";

type TrackingCapabilitySnapshotProps = {
  profile: ProfileData;
  origin: "tracking" | "profile" | "onboarding" | "weekly_review";
  title: string;
};

type TrackingSnapshotPayload = {
  checkins?: CheckinEntry[];
  mealLog?: MealLogEntry[];
  workoutLog?: WorkoutEntry[];
  passiveData?: PassiveHealthData;
};

export default function TrackingCapabilitySnapshot({
  profile,
  origin,
  title,
}: TrackingCapabilitySnapshotProps) {
  const [tracking, setTracking] = useState<TrackingSnapshotPayload | null>(null);
  const [projection, setProjection] = useState<TrackingProjectionCapabilityResult | null>(
    null,
  );
  const safeProfile = useMemo<ProfileData>(
    () => ({
      ...defaultProfile,
      ...profile,
      measurements: {
        ...defaultProfile.measurements,
        ...(profile.measurements ?? {}),
      },
      trainingPreferences: {
        ...defaultProfile.trainingPreferences,
        ...(profile.trainingPreferences ?? {}),
      },
      nutritionPreferences: {
        ...defaultProfile.nutritionPreferences,
        ...(profile.nutritionPreferences ?? {}),
      },
      macroPreferences: {
        ...defaultProfile.macroPreferences,
        ...(profile.macroPreferences ?? {}),
      },
    }),
    [profile],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [trackingResult, projectionResult] = await Promise.all([
        fetchTrackingSnapshotDeduped().catch(() => null),
        loadTrackingProjectionCapability(origin).catch(() => null),
      ]);

      if (!active) return;
      setTracking((trackingResult as TrackingSnapshotPayload | null) ?? null);
      setProjection(projectionResult);
    };

    void load();
    return () => {
      active = false;
    };
  }, [origin]);

  const bodyScan = useMemo(
    () =>
      buildTrackingBodyScanCapability({
        origin,
        profile: safeProfile,
        checkins: tracking?.checkins ?? [],
        passiveData: tracking?.passiveData,
        rangeDays: 30,
      }),
    [origin, safeProfile, tracking?.checkins, tracking?.passiveData],
  );

  const recommendation = useMemo(() => {
    const adherenceContext = selectTrackingAdherenceContext({
      checkins: tracking?.checkins ?? [],
      mealLog: tracking?.mealLog ?? [],
      workoutLog: tracking?.workoutLog ?? [],
      passiveData: tracking?.passiveData,
      profile: safeProfile,
      rangeDays: 30,
    });
    return buildTrackingRecommendationCapability({
      origin,
      profile: safeProfile,
      adherenceContext,
      bodyScan,
      projection: toTrackingRecommendationProjectionInput(projection),
      maxItems: 1,
    });
  }, [bodyScan, origin, projection, safeProfile, tracking?.checkins, tracking?.mealLog, tracking?.passiveData, tracking?.workoutLog]);

  return (
    <section className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/85 p-4">
      <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {title}
      </p>
      <p className="m-0 mt-2 text-sm text-[var(--text)]">{bodyScan.summary}</p>
      <p className="m-0 mt-2 text-sm text-[var(--text)]">{recommendation.summary}</p>
      {recommendation.items[0] ? (
        <div className="mt-3 flex items-center gap-2">
          <Link href={recommendation.items[0].cta.href} className="btn secondary fit-content">
            {recommendation.items[0].cta.label}
          </Link>
          <span className="text-xs text-[var(--muted)]">{recommendation.items[0].confidence}</span>
        </div>
      ) : null}
    </section>
  );
}
