ALTER TABLE "GymMembership"
ADD COLUMN IF NOT EXISTS "assignedNutritionPlanId" TEXT;

CREATE INDEX IF NOT EXISTS "GymMembership_assignedNutritionPlanId_idx"
ON "GymMembership"("assignedNutritionPlanId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'GymMembership_assignedNutritionPlanId_fkey'
  ) THEN
    ALTER TABLE "GymMembership"
    ADD CONSTRAINT "GymMembership_assignedNutritionPlanId_fkey"
    FOREIGN KEY ("assignedNutritionPlanId") REFERENCES "NutritionPlan"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
