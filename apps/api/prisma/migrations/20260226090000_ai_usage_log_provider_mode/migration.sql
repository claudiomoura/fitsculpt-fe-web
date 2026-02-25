-- Persist provider/mode/fallback details for AI usage audits by aiRequestId
ALTER TABLE "AiUsageLog"
ADD COLUMN "provider" TEXT,
ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'AI',
ADD COLUMN "fallbackReason" TEXT;
