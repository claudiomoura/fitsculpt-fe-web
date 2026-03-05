"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useLanguage } from "@/context/LanguageProvider";

type StartWorkoutModalProps = {
  open: boolean;
  onClose: () => void;
  onStart: () => void;
  onViewDetail?: () => void;
  workoutName?: string;
  durationMinutes?: number | null;
  exercises?: string[];
};

export function StartWorkoutModal({
  open,
  onClose,
  onStart,
  onViewDetail,
  workoutName,
  durationMinutes,
  exercises = [],
}: StartWorkoutModalProps) {
  const { t } = useLanguage();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={workoutName || t("today.startWorkoutDefaultTitle")}
      className="today-premium-modal"
    >
      <div className="grid gap-4" data-testid="start-workout-modal">
        {durationMinutes ? <p className="m-0 text-sm text-slate-300">{t("today.startWorkoutDuration", { minutes: durationMinutes })}</p> : null}

        {exercises.length > 0 ? (
          <div className="grid gap-2">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.1em] text-cyan-300">{t("today.startWorkoutPreviewTitle")}</p>
            <ul className="m-0 grid gap-2 p-0">
              {exercises.slice(0, 3).map((exerciseName, index) => (
                <li
                  key={`${exerciseName}-${index}`}
                  className="list-none rounded-2xl border px-3 py-2 text-sm text-slate-200"
                  style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
                >
                  {exerciseName}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onStart} className="min-h-11 sm:order-3" data-testid="start-workout-confirm">
            {t("today.startWorkoutConfirm")}
          </Button>
          {onViewDetail ? (
            <Button variant="secondary" onClick={onViewDetail} className="min-h-11 sm:order-2">
              {t("today.viewDetailCta")}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose} className="min-h-11 sm:order-1">
            {t("ui.cancel")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
