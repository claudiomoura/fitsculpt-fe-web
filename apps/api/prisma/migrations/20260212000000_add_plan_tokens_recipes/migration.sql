ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN IF NOT EXISTS "tokenBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "tokensExpireAt" TIMESTAMP(3);

UPDATE "User"
SET "plan" = "subscriptionPlan"
WHERE "subscriptionPlan" IS NOT NULL;

UPDATE "User"
SET "tokenBalance" = "aiTokenBalance"
WHERE "aiTokenBalance" IS NOT NULL;

UPDATE "User"
SET "tokensExpireAt" = "aiTokenRenewalAt"
WHERE "aiTokenRenewalAt" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "Recipe" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "calories" DOUBLE PRECISION NOT NULL,
  "protein" DOUBLE PRECISION NOT NULL,
  "carbs" DOUBLE PRECISION NOT NULL,
  "fat" DOUBLE PRECISION NOT NULL,
  "photoUrl" TEXT,
  "steps" TEXT[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RecipeIngredient" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "grams" DOUBLE PRECISION NOT NULL,

  CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Recipe_name_key" ON "Recipe"("name");
CREATE INDEX IF NOT EXISTS "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");

ALTER TABLE "RecipeIngredient"
ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
