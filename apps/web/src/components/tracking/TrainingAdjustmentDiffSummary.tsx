"use client";

import type { TrainingPlanData } from "@/lib/profile";
import { useLanguage } from "@/context/LanguageProvider";

export type TrainingAdjustmentDiff = {
  changedDays: number;
  addedExercises: number;
  removedExercises: number;
  durationDeltaMinutes: number;
};

function getExerciseKey(name: string, sets: string | number, reps?: string): string {
  return `${name.trim().toLowerCase()}::${String(sets).trim().toLowerCase()}::${(reps ?? "").trim().toLowerCase()}`;
}

export function buildTrainingAdjustmentDiff(
  previousPlan: TrainingPlanData | null | undefined,
  nextPlan: TrainingPlanData | null | undefined
): TrainingAdjustmentDiff {
  const previousDays = previousPlan?.days ?? [];
  const nextDays = nextPlan?.days ?? [];
  const maxDays = Math.max(previousDays.length, nextDays.length);

  let changedDays = 0;
  let addedExercises = 0;
  let removedExercises = 0;
  let durationDeltaMinutes = 0;

  for (let index = 0; index < maxDays; index += 1) {
    const previousDay = previousDays[index];
    const nextDay = nextDays[index];
    if (!nextDay && !previousDay) continue;

    const previousMap = new Map<string, number>();
    for (const exercise of previousDay?.exercises ?? []) {
      const key = getExerciseKey(exercise.name, exercise.sets, exercise.reps);
      previousMap.set(key, (previousMap.get(key) ?? 0) + 1);
    }

    const nextMap = new Map<string, number>();
    for (const exercise of nextDay?.exercises ?? []) {
      const key = getExerciseKey(exercise.name, exercise.sets, exercise.reps);
      nextMap.set(key, (nextMap.get(key) ?? 0) + 1);
    }

    const keyUnion = new Set([...previousMap.keys(), ...nextMap.keys()]);
    let dayChanged = false;

    keyUnion.forEach((key) => {
      const previousCount = previousMap.get(key) ?? 0;
      const nextCount = nextMap.get(key) ?? 0;
      if (nextCount > previousCount) {
        addedExercises += nextCount - previousCount;
        dayChanged = true;
      } else if (nextCount < previousCount) {
        removedExercises += previousCount - nextCount;
        dayChanged = true;
      }
    });

    const previousDuration = previousDay?.duration ?? 0;
    const nextDuration = nextDay?.duration ?? 0;
    if (previousDuration !== nextDuration) {
      durationDeltaMinutes += nextDuration - previousDuration;
      dayChanged = true;
    }

    const previousFocus = previousDay?.focus ?? "";
    const nextFocus = nextDay?.focus ?? "";
    if (previousFocus !== nextFocus) {
      dayChanged = true;
    }

    if (dayChanged) changedDays += 1;
  }

  return {
    changedDays,
    addedExercises,
    removedExercises,
    durationDeltaMinutes,
  };
}

type Props = {
  diff: TrainingAdjustmentDiff;
};

export default function TrainingAdjustmentDiffSummary({ diff }: Props) {
  const { t } = useLanguage();
  const hasChanges =
    diff.changedDays > 0 || diff.addedExercises > 0 || diff.removedExercises > 0 || diff.durationDeltaMinutes !== 0;

  return (
    <div className="feature-card" style={{ marginTop: 12 }} role="status" aria-live="polite">
      <strong>{t("tracking.adjustmentChangesTitle")}</strong>
      {hasChanges ? (
        <ul className="muted" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
          <li>{t("tracking.adjustmentChangedDays").replace("{count}", String(diff.changedDays))}</li>
          <li>{t("tracking.adjustmentAddedExercises").replace("{count}", String(diff.addedExercises))}</li>
          <li>{t("tracking.adjustmentRemovedExercises").replace("{count}", String(diff.removedExercises))}</li>
          <li>{t("tracking.adjustmentDurationDelta").replace("{minutes}", String(diff.durationDeltaMinutes))}</li>
        </ul>
      ) : (
        <p className="muted" style={{ marginTop: 6 }}>{t("tracking.adjustmentChangesEmpty")}</p>
      )}
    </div>
  );
}
