ALTER TABLE "GymMembership"
ADD COLUMN IF NOT EXISTS "assignedTrainingPlanId" TEXT;

CREATE INDEX IF NOT EXISTS "GymMembership_assignedTrainingPlanId_idx"
ON "GymMembership"("assignedTrainingPlanId");

ALTER TABLE "GymMembership"
ADD CONSTRAINT "GymMembership_assignedTrainingPlanId_fkey"
FOREIGN KEY ("assignedTrainingPlanId") REFERENCES "TrainingPlan"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
