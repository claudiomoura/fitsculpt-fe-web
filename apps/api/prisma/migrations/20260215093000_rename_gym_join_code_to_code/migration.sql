DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Gym' AND column_name = 'joinCode'
  ) THEN
    ALTER TABLE "Gym" RENAME COLUMN "joinCode" TO "code";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Gym' AND column_name = 'code'
  ) THEN
    ALTER TABLE "Gym" ADD COLUMN "code" TEXT;
  END IF;
END $$;

UPDATE "Gym" SET "code" = UPPER(SUBSTRING(MD5("id") FROM 1 FOR 8)) WHERE "code" IS NULL;

ALTER TABLE "Gym" ALTER COLUMN "code" SET NOT NULL;

DROP INDEX IF EXISTS "Gym_joinCode_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Gym_code_key" ON "Gym"("code");
