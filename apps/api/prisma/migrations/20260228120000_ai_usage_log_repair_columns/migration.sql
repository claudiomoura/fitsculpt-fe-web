-- Repair drift causing Prisma P2022 in AI debit/log path.
ALTER TABLE "AiUsageLog"
ADD COLUMN IF NOT EXISTS "provider" TEXT,
ADD COLUMN IF NOT EXISTS "mode" TEXT,
ADD COLUMN IF NOT EXISTS "fallbackReason" TEXT;

UPDATE "AiUsageLog"
SET "mode" = 'AI'
WHERE "mode" IS NULL;

ALTER TABLE "AiUsageLog"
ALTER COLUMN "mode" SET DEFAULT 'AI',
ALTER COLUMN "mode" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "AiUsageLog_userId_feature_requestId_mode_key"
ON "AiUsageLog"("userId", "feature", "requestId", "mode");
