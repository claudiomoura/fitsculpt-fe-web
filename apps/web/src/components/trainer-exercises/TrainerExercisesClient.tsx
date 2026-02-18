"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { getUserRoleFlags } from "@/lib/userCapabilities";
import { auditTrainerExerciseCapabilities } from "@/lib/trainer-exercises/capabilityAudit";
import type { Exercise } from "@/lib/types";

type LoadState = "loading" | "ready" | "error";

type AuthUser = Record<string, unknown>;

type ExercisesResponse = {
  exercises?: Exercise[];
  items?: Exercise[];
};

function getExerciseThumbnail(exercise: Exercise): string | null {
  return exercise.imageUrl ?? exercise.posterUrl ?? null;
}

export default function TrainerExercisesClient() {
  const { t } = useLanguage();
  const [permissionState, setPermissionState] = useState<LoadState>("loading");
  const [exercisesState, setExercisesState] = useState<LoadState>("loading");
  const [canAccessTrainer, setCanAccessTrainer] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [canCreateExercise, setCanCreateExercise] = useState(false);
  const [canUploadMedia, setCanUploadMedia] = useState(false);

  const loadExercises = useCallback(async () => {
    setExercisesState("loading");

    try {
      const response = await fetch("/api/exercises", { cache: "no-store" });
      if (!response.ok) {
        setExercisesState("error");
        return;
      }

      const data = (await response.json()) as ExercisesResponse;
      setExercises(Array.isArray(data.exercises) ? data.exercises : Array.isArray(data.items) ? data.items : []);
      setExercisesState("ready");
    } catch (_err) {
      setExercisesState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadAccess = async () => {
      try {
        const [meResponse, capabilities] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          auditTrainerExerciseCapabilities(),
        ]);

        if (!meResponse.ok) {
          if (active) setPermissionState("error");
          return;
        }

        const profile = (await meResponse.json()) as AuthUser;
        const roleFlags = getUserRoleFlags(profile);
        const hasAccess = roleFlags.isTrainer || roleFlags.isAdmin;

        if (!active) return;

        setCanAccessTrainer(hasAccess);
        setCanCreateExercise(capabilities.canCreateExercise);
        setCanUploadMedia(capabilities.canUploadMedia);
        setPermissionState("ready");

        if (hasAccess) {
          void loadExercises();
        }
      } catch (_err) {
        if (active) setPermissionState("error");
      }
    };

    void loadAccess();

    return () => {
      active = false;
    };
  }, [loadExercises]);

  const listBody = useMemo(() => {
    if (exercisesState === "loading") {
      return (
        <div className="form-stack" aria-busy="true" aria-live="polite">
          <p className="muted">{t("library.loading")}</p>
          <div className="card" style={{ minHeight: 76 }} />
          <div className="card" style={{ minHeight: 76 }} />
        </div>
      );
    }

    if (exercisesState === "error") {
      return (
        <div className="card form-stack" role="status">
          <p className="muted">{t("library.loadErrorList")}</p>
          <button type="button" className="btn secondary" onClick={() => void loadExercises()}>
            {t("ui.retry")}
          </button>
        </div>
      );
    }

    if (exercises.length === 0) {
      return (
        <div className="card" role="status">
          <p className="muted">{t("library.empty")}</p>
        </div>
      );
    }

    return (
      <ul className="form-stack" aria-label={t("library.tabs.exercises")}>
        {exercises.map((exercise) => (
          <li key={exercise.id} className="card">
            <Link href={`/app/biblioteca/${exercise.id}`} className="sidebar-link" style={{ display: "block" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {getExerciseThumbnail(exercise) ? (
                  <img
                    src={getExerciseThumbnail(exercise) ?? ""}
                    alt={t("library.thumbnailAlt").replace("{exercise}", exercise.name)}
                    width={72}
                    height={72}
                    style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, flexShrink: 0 }}
                  />
                ) : (
                  <div
                    role="img"
                    aria-label={t("library.thumbnailMissing")}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 10,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <span className="muted" style={{ fontSize: 12 }}>{t("library.thumbnailPlaceholder")}</span>
                  </div>
                )}
                <div>
                  <strong>{exercise.name}</strong>
                  <p className="muted" style={{ margin: "4px 0 0" }}>
                    {exercise.description || t("library.descriptionFallback")}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    );
  }, [exercises, exercisesState, loadExercises, t]);

  if (permissionState === "loading") {
    return <p className="muted">{t("trainer.loading")}</p>;
  }

  if (permissionState === "error") {
    return <p className="muted">{t("trainer.error")}</p>;
  }

  if (!canAccessTrainer) {
    return (
      <div className="feature-card form-stack" role="status">
        <p className="muted">{t("trainer.unauthorized")}</p>
        <Link href="/app" className="btn secondary" style={{ width: "fit-content" }}>
          {t("trainer.backToDashboard")}
        </Link>
      </div>
    );
  }

  return (
    <div className="section-stack">
      <div className="feature-card form-stack">
        <h2 style={{ margin: 0 }}>{t("library.tabs.exercises")}</h2>
        {canCreateExercise ? (
          <Link href="/app/trainer/exercises/new" className="btn primary" style={{ width: "fit-content" }}>
            {t("training.manualCreate")}
          </Link>
        ) : (
          <p className="muted" style={{ margin: 0 }}>{t("trainer.notAvailable")}</p>
        )}
        {!canUploadMedia ? <p className="muted" style={{ margin: 0 }}>{t("trainer.notAvailable")}</p> : null}
      </div>

      <section className="section-stack" aria-labelledby="trainer-exercise-list-title">
        <h2 id="trainer-exercise-list-title" className="section-title" style={{ fontSize: 20 }}>
          {t("library.tabs.exercises")}
        </h2>
        {listBody}
      </section>
    </div>
  );
}
