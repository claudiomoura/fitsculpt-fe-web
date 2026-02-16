ALTER TABLE "Exercise"
  ADD COLUMN IF NOT EXISTS "sourceId" TEXT,
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Exercise_sourceId_key" ON "Exercise"("sourceId");
