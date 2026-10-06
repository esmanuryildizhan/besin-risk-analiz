/*
  Warnings:

  - Added the required column `kcal` to the `DiaryEntry` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DiaryEntry" DROP CONSTRAINT "DiaryEntry_foodId_fkey";

-- AlterTable
ALTER TABLE "DiaryEntry" ADD COLUMN     "kcal" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "label" TEXT,
ALTER COLUMN "date" SET DATA TYPE DATE,
ALTER COLUMN "amount" DROP NOT NULL,
ALTER COLUMN "foodId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "kcalGoal" INTEGER,
ADD COLUMN     "waterGoalL" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "DiaryDay" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "burnedKcal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waterL" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "DiaryDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiaryDay_userId_date_key" ON "DiaryDay"("userId", "date");

-- CreateIndex
CREATE INDEX "DiaryEntry_userId_date_idx" ON "DiaryEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryDay" ADD CONSTRAINT "DiaryDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
