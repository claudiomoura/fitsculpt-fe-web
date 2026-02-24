ALTER TABLE "TrainingExercise"
ADD COLUMN "exerciseId" TEXT,
ADD COLUMN "imageUrl" TEXT;

CREATE INDEX "TrainingExercise_exerciseId_idx" ON "TrainingExercise"("exerciseId");
