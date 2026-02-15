ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "activationCode" TEXT;

UPDATE "Gym"
SET "activationCode" = "code"
WHERE "activationCode" IS NULL;

ALTER TABLE "Gym" ALTER COLUMN "activationCode" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Gym_activationCode_key" ON "Gym"("activationCode");
