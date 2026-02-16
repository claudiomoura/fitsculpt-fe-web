ALTER TABLE "Exercise"
  ADD COLUMN IF NOT EXISTS "source" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceId" TEXT,
  ADD COLUMN IF NOT EXISTS "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "Exercise_name_idx" ON "Exercise"("name");
CREATE INDEX IF NOT EXISTS "Exercise_source_sourceId_idx" ON "Exercise"("source", "sourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "Exercise_source_sourceId_key" ON "Exercise"("source", "sourceId") WHERE "source" IS NOT NULL AND "sourceId" IS NOT NULL;
