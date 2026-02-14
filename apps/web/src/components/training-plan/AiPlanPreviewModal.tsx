"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { TrainingPlanData } from "@/lib/profile";

type Props = {
  open: boolean;
  plan: TrainingPlanData | null;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  savingLabel: string;
  durationUnit: string;
  onClose: () => void;
  onConfirm: () => void;
  isSaving: boolean;
};

export function AiPlanPreviewModal({
  open,
  plan,
  title,
  description,
  cancelLabel,
  confirmLabel,
  savingLabel,
  durationUnit,
  onClose,
  onConfirm,
  isSaving,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>{cancelLabel}</Button>
          <Button onClick={onConfirm} loading={isSaving}>{isSaving ? savingLabel : confirmLabel}</Button>
        </>
      )}
    >
      <div className="form-stack" style={{ maxHeight: "55vh", overflowY: "auto" }}>
        {plan?.days?.map((day, index) => (
          <div key={`${day.label}-${index}`} className="feature-card">
            <p style={{ margin: 0 }}><strong>{day.label}</strong> · {day.focus}</p>
            <p className="muted" style={{ marginTop: 6 }}>{day.duration} {durationUnit}</p>
            <ul style={{ margin: "6px 0 0", paddingInlineStart: 20 }}>
              {day.exercises.slice(0, 5).map((exercise, exerciseIndex) => (
                <li key={`${day.label}-${exercise.name}-${exerciseIndex}`}>
                  {exercise.name} · {exercise.sets}{exercise.reps ? ` x ${exercise.reps}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}
