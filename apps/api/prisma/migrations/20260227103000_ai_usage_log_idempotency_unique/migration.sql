-- Ensure idempotent AI usage logging per user/feature/request/mode.
CREATE UNIQUE INDEX IF NOT EXISTS "AiUsageLog_userId_feature_requestId_mode_key"
ON "AiUsageLog"("userId", "feature", "requestId", "mode");
