"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageProvider";
import { getTrackingRangeConfig } from "@/lib/trackingProfessionalRules";
import {
  buildTrackingBodyScanCapability,
  estimateTrackingBodyScanTokens,
  selectPassiveSupportOverview,
  type TrackingBodyScanCapability,
  type TrackingRecommendationCapability,
} from "@/domains/tracking-intelligence";
import { hasAiEntitlement } from "@/components/access/aiEntitlements";
import { getUserProfile } from "@/lib/profileService";
import { defaultProfile, type ProfileData } from "@/lib/profile";
import { defaultPassiveHealthData } from "@/lib/passiveHealth";
import type {
  CheckinEntry,
  PassiveHealthData,
} from "@/services/tracking";
import {
  analyzeTrackingBodyFatScan,
  type BodyFatScanExecutionResult,
} from "@/services/trackingBodyFatScan";
import TrackingAiBodyFatScanPanel from "@/components/tracking-intelligence/TrackingAiBodyFatScanPanel";
import { LoadingState } from "@/components/states";
import BodyScanReportContent from "./BodyScanReportContent";
import styles from "./BodyScanReportContent.module.css";

type BodyScanReportClientProps = object;

export default function BodyScanReportClient(_props: BodyScanReportClientProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [passiveData, setPassiveData] = useState<PassiveHealthData>(defaultPassiveHealthData);
  const [progressRange, setProgressRange] = useState(30);
  
  const [bodyFatScanRunState, setBodyFatScanRunState] = useState<"idle" | "loading" | "failed">("idle");
  const [bodyFatScanRunError, setBodyFatScanRunError] = useState<string | null>(null);
  const [bodyFatScanResult, setBodyFatScanResult] = useState<BodyFatScanExecutionResult | null>(null);
  
  const [adjustmentTokenBalance, setAdjustmentTokenBalance] = useState<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    let active = true;
    isMountedRef.current = true;

    const loadData = async () => {
      try {
        const [profileData, trackingResponse] = await Promise.all([
          getUserProfile(),
          fetch("/api/tracking", { cache: "no-store", credentials: "include" }),
        ]);
        
        if (!active || !isMountedRef.current) return;
        
        if (profileData) setProfile(profileData);
        
        if (trackingResponse.ok) {
          const trackingData = await trackingResponse.json();
          setCheckins(trackingData.checkins ?? []);
          setPassiveData(trackingData.passiveData ?? defaultPassiveHealthData);
        }
        
        const range = getTrackingRangeConfig(30);
        setProgressRange(range.days);
        
        setStatus("ready");
      } catch {
        if (active && isMountedRef.current) {
          setStatus("error");
        }
      }
    };

    void loadData();
    
    return () => {
      active = false;
      isMountedRef.current = false;
    };
  }, []);

  const hasPro = useMemo(() => hasAiEntitlement(profile), [profile]);
  
  const estimatedTokens = useMemo(
    () => estimateTrackingBodyScanTokens({
      origin: "body_scan_report",
      profile,
      checkins,
      passiveData,
      rangeDays: progressRange,
    }),
    [profile, checkins, passiveData, progressRange],
  );
  
  const capability = useMemo(
    () => buildTrackingBodyScanCapability({
      origin: "body_scan_report",
      profile,
      checkins,
      passiveData,
      rangeDays: progressRange,
    }),
    [profile, checkins, passiveData, progressRange],
  );

  const handleAnalyze = async () => {
    if (bodyFatScanRunState === "loading") return;
    
    // Get latest checkin with photos
    const latestWithPhotos = [...checkins]
      .sort((a, b) => b.date.localeCompare(a.date))
      .find(c => c.frontPhotoUrl && c.sidePhotoUrl);
    
    if (!latestWithPhotos) {
      setBodyFatScanRunError("Necesitas fotos frontal y lateral en un check-in para ejecutar el análisis");
      setBodyFatScanRunState("failed");
      return;
    }
    
    setBodyFatScanRunState("loading");
    setBodyFatScanRunError(null);
    
    try {
      const result = await analyzeTrackingBodyFatScan({
        frontPhotoDataUrl: latestWithPhotos.frontPhotoUrl!,
        sidePhotoDataUrl: latestWithPhotos.sidePhotoUrl!,
        dorsalPhotoDataUrl: latestWithPhotos.backPhotoUrl ?? undefined,
        locale: "es",
      });
      
      if (!isMountedRef.current) return;
      
      if (result.ok && result.data) {
        setBodyFatScanResult(result.data);
        setBodyFatScanRunState("idle");
      } else {
        setBodyFatScanRunError(result.ok ? result.data?.errorMessage ?? result.data?.summary : "Error al ejecutar el análisis");
        setBodyFatScanRunState("failed");
      }
    } catch (err) {
      if (isMountedRef.current) {
        setBodyFatScanRunError(err instanceof Error ? err.message : "Error al ejecutar el análisis");
        setBodyFatScanRunState("failed");
      }
    }
  };

  const handleRetry = () => {
    setBodyFatScanRunState("idle");
    setBodyFatScanRunError(null);
    setBodyFatScanResult(null);
  };

  if (status === "loading") {
    return (
      <div className={styles.shell}>
        <LoadingState ariaLabel="Cargando reporte corporal" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={styles.shell}>
        <p>Error al cargar el reporte. Por favor intenta de nuevo.</p>
        <Link href="/app/seguimiento" className="btn secondary">Volver a progreso</Link>
      </div>
    );
  }

  return (
    <BodyScanReportContent
      profile={profile}
      checkins={checkins}
      passiveData={passiveData}
      progressRange={progressRange}
      tokenBalance={adjustmentTokenBalance}
      recommendationCapability={{
        capability: "recommendation",
        status: capability.status,
        origin: "body_scan_report",
        errorMessage: null,
        analysisMode: "deterministic_fallback",
        summary: capability.summary,
        inputMatrix: { 
          hasCheckins: checkins.length > 0, 
          hasWorkoutLog: false, 
          hasMealLog: false,
          hasPassiveSupport: true,
          hasBodyScan: true,
          hasProjection: false,
          canCombineProjectionAndScan: false,
        },
        items: [],
        deterministicFallbackUsed: false,
        compliance: capability.compliance,
        aiAssist: {
          status: "not_requested",
          failureReason: null,
          message: null,
          estimatedTokens: null,
          reservationId: null,
        },
        explainability: { sourceStatus: "unavailable", fallbackLabel: null, summary: capability.summary, rationale: [] },
      }}
      bodyFatScanResult={bodyFatScanResult}
      bodyFatScanRunState={bodyFatScanRunState}
      bodyFatScanRunError={bodyFatScanRunError}
      onAnalyze={handleAnalyze}
      onRetry={handleRetry}
    />
  );
}