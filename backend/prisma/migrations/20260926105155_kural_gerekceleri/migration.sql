/*
  Warnings:

  - You are about to drop the column `fdcId` on the `Food` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[externalId]` on the table `Food` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `externalId` to the `Food` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Food_fdcId_key";

-- AlterTable
ALTER TABLE "DiseaseRule" ADD COLUMN     "onlyLargePortion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceNote" TEXT;

-- AlterTable
ALTER TABLE "Food" DROP COLUMN "fdcId",
ADD COLUMN     "externalId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Food_externalId_key" ON "Food"("externalId");
