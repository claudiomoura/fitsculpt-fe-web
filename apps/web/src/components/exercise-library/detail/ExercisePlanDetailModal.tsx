"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { ExerciseThumbnail } from "@/components/exercises/ExerciseThumbnail";

type PlanExerciseLike = {
  id?: string;
  exerciseId?: string;
  imageUrl?: string;
  name: string;
  sets: string | number;
  reps?: string;
  notes?: string;
};

type ExercisePlanDetailModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  exercise: PlanExerciseLike | null;
  imageUrl: string | null;
  prescriptionLabel: string;
  notesLabel: string;
  emptyNotesLabel: string;
  viewLibraryLabel: string;
  viewLibraryHref?: string | null;
};

export function ExercisePlanDetailModal({
  open,
  onClose,
  title,
  description,
  exercise,
  imageUrl,
  prescriptionLabel,
  notesLabel,
  emptyNotesLabel,
  viewLibraryLabel,
  viewLibraryHref,
}: ExercisePlanDetailModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      {exercise ? (
        <div className="form-stack" data-testid="training-exercise-detail-modal">
          <ExerciseThumbnail
            className="exercise-thumb"
            src={imageUrl}
            alt={exercise.name}
            width={320}
            height={220}
          />
          <div className="feature-card">
            <p className="m-0"><strong>{prescriptionLabel}</strong></p>
            <p className="m-0 muted">
              {exercise.reps ? `${exercise.sets} x ${exercise.reps}` : exercise.sets}
            </p>
          </div>
          <div className="feature-card">
            <p className="m-0"><strong>{notesLabel}</strong></p>
            <p className="m-0 muted">{exercise.notes?.trim() || emptyNotesLabel}</p>
          </div>
          {viewLibraryHref ? (
            <Link href={viewLibraryHref} className="btn secondary fit-content" data-testid="training-exercise-view-library">
              {viewLibraryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

