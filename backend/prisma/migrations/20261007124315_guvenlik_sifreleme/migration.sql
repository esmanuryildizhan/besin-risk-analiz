/*
  Warnings:

  - You are about to drop the column `foodId` on the `DiaryEntry` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "DiaryEntry" DROP CONSTRAINT "DiaryEntry_foodId_fkey";

-- AlterTable
ALTER TABLE "DiaryDay" ALTER COLUMN "burnedKcal" DROP NOT NULL,
ALTER COLUMN "burnedKcal" DROP DEFAULT,
ALTER COLUMN "burnedKcal" SET DATA TYPE TEXT,
ALTER COLUMN "waterL" DROP NOT NULL,
ALTER COLUMN "waterL" DROP DEFAULT,
ALTER COLUMN "waterL" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "DiaryEntry" DROP COLUMN "foodId",
ADD COLUMN     "foodRef" TEXT,
ALTER COLUMN "amount" SET DATA TYPE TEXT,
ALTER COLUMN "kcal" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "LabResult" ALTER COLUMN "value" SET DATA TYPE TEXT,
ALTER COLUMN "refLow" SET DATA TYPE TEXT,
ALTER COLUMN "refHigh" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "oturumlarGecersizAt" TIMESTAMP(3),
ADD COLUMN     "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpSecret" TEXT,
ADD COLUMN     "totpYedekKodlari" TEXT[];

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" SERIAL NOT NULL,
    "tokenOzeti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenOzeti_key" ON "PasswordReset"("tokenOzeti");

-- CreateIndex
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
