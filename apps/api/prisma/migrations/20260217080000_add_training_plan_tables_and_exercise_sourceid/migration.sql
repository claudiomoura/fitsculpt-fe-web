-- Create TrainingPlan tables if missing (needed by 20260217090000_add_gym_member_assigned_training_plan)

CREATE TABLE IF NOT EXISTS "TrainingPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "goal" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "daysPerWeek" INTEGER NOT NULL,
  "focus" TEXT NOT NULL,
  "equipment" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "daysCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TrainingPlan_userId_fkey'
  ) THEN
    ALTER TABLE "TrainingPlan"
    ADD CONSTRAINT "TrainingPlan_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TrainingPlan_userId_idx" ON "TrainingPlan"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingPlan_userId_startDate_daysCount_key"
  ON "TrainingPlan"("userId","startDate","daysCount");

CREATE TABLE IF NOT EXISTS "TrainingDay" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "label" TEXT NOT NULL,
  "focus" TEXT NOT NULL,
  "duration" INTEGER NOT NULL,
  "order" INTEGER NOT NULL,
  CONSTRAINT "TrainingDay_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TrainingDay_planId_fkey'
  ) THEN
    ALTER TABLE "TrainingDay"
    ADD CONSTRAINT "TrainingDay_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TrainingDay_planId_idx" ON "TrainingDay"("planId");

CREATE TABLE IF NOT EXISTS "TrainingExercise" (
  "id" TEXT NOT NULL,
  "dayId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sets" INTEGER NOT NULL,
  "reps" TEXT,
  "tempo" TEXT,
  "rest" INTEGER,
  "notes" TEXT,
  CONSTRAINT "TrainingExercise_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TrainingExercise_dayId_fkey'
  ) THEN
    ALTER TABLE "TrainingExercise"
    ADD CONSTRAINT "TrainingExercise_dayId_fkey"
    FOREIGN KEY ("dayId") REFERENCES "TrainingDay"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TrainingExercise_dayId_idx" ON "TrainingExercise"("dayId");

-- Ensure Exercise.sourceId exists (import script needs it)
ALTER TABLE "Exercise" ADD COLUMN IF NOT EXISTS "sourceId" TEXT;
ALTER TABLE "Exercise" ADD COLUMN IF NOT EXISTS "source" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Exercise_sourceId_key" ON "Exercise"("sourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "Exercise_source_sourceId_key" ON "Exercise"("source","sourceId");
CREATE INDEX IF NOT EXISTS "Exercise_source_sourceId_idx" ON "Exercise"("source","sourceId");
