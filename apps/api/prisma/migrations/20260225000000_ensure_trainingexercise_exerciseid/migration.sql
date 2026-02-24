ALTER TABLE "TrainingExercise"
ADD COLUMN IF NOT EXISTS "exerciseId" TEXT;

CREATE INDEX IF NOT EXISTS "TrainingExercise_exerciseId_idx"
ON "TrainingExercise"("exerciseId");
