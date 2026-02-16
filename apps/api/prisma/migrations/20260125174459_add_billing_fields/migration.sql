/*
  Warnings:

  - You are about to drop the column `plan` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tokenBalance` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tokensExpireAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "plan",
DROP COLUMN IF EXISTS "tokenBalance",
DROP COLUMN IF EXISTS "tokensExpireAt";
