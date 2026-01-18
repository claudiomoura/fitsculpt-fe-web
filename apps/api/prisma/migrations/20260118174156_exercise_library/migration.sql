/*
  Warnings:

  - You are about to drop the column `primaryMuscles` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryMuscles` on the `Exercise` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Exercise` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mainMuscleGroup` to the `Exercise` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Exercise` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Exercise_name_key";

-- AlterTable
ALTER TABLE "Exercise" DROP COLUMN "primaryMuscles",
DROP COLUMN "secondaryMuscles",
ADD COLUMN     "isUserCreated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mainMuscleGroup" TEXT NOT NULL,
ADD COLUMN     "secondaryMuscleGroups" TEXT[],
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "technique" TEXT,
ADD COLUMN     "tips" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_slug_key" ON "Exercise"("slug");
