import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sql = `
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT,
ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "aiTokenBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "aiTokenMonthlyAllowance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "aiTokenRenewalAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "aiTokenResetAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "User_stripeCustomerId_idx" ON "User"("stripeCustomerId");
CREATE INDEX IF NOT EXISTS "User_stripeSubscriptionId_idx" ON "User"("stripeSubscriptionId");
`;

const main = async () => {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log("User billing/AI columns repaired (if needed).");
  } finally {
    await prisma.$disconnect();
  }
};

void main();
