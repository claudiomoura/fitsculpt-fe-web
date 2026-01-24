/*
  Fix:
  - Make DROP safe for shadow DB
  - Add required columns as nullable first, backfill, then set NOT NULL
  - Ensure slug uniqueness for existing rows
*/

-- DropIndex (safe)
DROP INDEX IF EXISTS "Exercise_name_key";

-- AlterTable (safe-ish)
ALTER TABLE "Exercise"
  DROP COLUMN IF EXISTS "primaryMuscles",
  DROP COLUMN IF EXISTS "secondaryMuscles",
  ADD COLUMN IF NOT EXISTS "isUserCreated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "mainMuscleGroup" TEXT,
  ADD COLUMN IF NOT EXISTS "secondaryMuscleGroups" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "slug" TEXT,
  ADD COLUMN IF NOT EXISTS "technique" TEXT,
  ADD COLUMN IF NOT EXISTS "tips" TEXT;

-- Backfill existing rows (if any)
UPDATE "Exercise"
SET
  "mainMuscleGroup" = COALESCE("mainMuscleGroup", 'General'),
  "slug" = COALESCE(
    "slug",
    lower(
      regexp_replace(
        regexp_replace(trim("name"), '[^a-zA-Z0-9]+', '-', 'g'),
        '(^-|-$)',
        '',
        'g'
      )
    )
  )
WHERE "mainMuscleGroup" IS NULL OR "slug" IS NULL;

-- Make slugs unique if duplicates exist
WITH dups AS (
  SELECT
    id,
    slug,
    row_number() OVER (PARTITION BY slug ORDER BY id) AS rn
  FROM "Exercise"
)
UPDATE "Exercise" e
SET slug = e.slug || '-' || d.rn
FROM dups d
WHERE e.id = d.id AND d.rn > 1;

-- Enforce NOT NULL after backfill
ALTER TABLE "Exercise"
  ALTER COLUMN "mainMuscleGroup" SET NOT NULL,
  ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex (safe)
CREATE UNIQUE INDEX IF NOT EXISTS "Exercise_slug_key" ON "Exercise"("slug");
