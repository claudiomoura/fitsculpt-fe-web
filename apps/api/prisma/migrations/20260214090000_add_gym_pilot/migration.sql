DO $$
BEGIN
  CREATE TYPE "GymMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE "GymRole" AS ENUM ('ADMIN', 'TRAINER', 'MEMBER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Gym" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "joinCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Gym_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GymMembership" (
  "id" TEXT NOT NULL,
  "gymId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "GymMembershipStatus" NOT NULL,
  "role" "GymRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GymMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Gym_joinCode_key" ON "Gym"("joinCode");
CREATE INDEX IF NOT EXISTS "Gym_name_idx" ON "Gym"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "GymMembership_gymId_userId_key" ON "GymMembership"("gymId", "userId");
CREATE INDEX IF NOT EXISTS "GymMembership_gymId_status_idx" ON "GymMembership"("gymId", "status");
CREATE INDEX IF NOT EXISTS "GymMembership_userId_status_idx" ON "GymMembership"("userId", "status");

DO $$
BEGIN
  ALTER TABLE "GymMembership"
  ADD CONSTRAINT "GymMembership_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER TABLE "GymMembership"
  ADD CONSTRAINT "GymMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
