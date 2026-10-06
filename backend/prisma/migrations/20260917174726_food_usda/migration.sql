/*
  Warnings:

  - You are about to drop the column `allergenInfoKnown` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `brand` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `hasGluten` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `hasGlutenTrace` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `hasMilk` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `hasMilkTrace` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `isTurkish` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `labeledGlutenFree` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `labeledLactoseFree` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `nameLang` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `novaGroup` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `nutriscoreGrade` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `saltG` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `uniqueScans` on the `Food` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fdcId]` on the table `Food` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fdcId` to the `Food` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameEn` to the `Food` table without a default value. This is not possible if the table is not empty.
  - Added the required column `portionGrams` to the `Food` table without a default value. This is not possible if the table is not empty.
  - Added the required column `portionName` to the `Food` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `Food` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Food_code_key";

-- AlterTable
ALTER TABLE "Food" DROP COLUMN "allergenInfoKnown",
DROP COLUMN "brand",
DROP COLUMN "code",
DROP COLUMN "hasGluten",
DROP COLUMN "hasGlutenTrace",
DROP COLUMN "hasMilk",
DROP COLUMN "hasMilkTrace",
DROP COLUMN "isTurkish",
DROP COLUMN "labeledGlutenFree",
DROP COLUMN "labeledLactoseFree",
DROP COLUMN "nameLang",
DROP COLUMN "novaGroup",
DROP COLUMN "nutriscoreGrade",
DROP COLUMN "saltG",
DROP COLUMN "uniqueScans",
ADD COLUMN     "caffeineMg" DOUBLE PRECISION,
ADD COLUMN     "calciumMg" DOUBLE PRECISION,
ADD COLUMN     "fdcId" INTEGER NOT NULL,
ADD COLUMN     "folateUg" DOUBLE PRECISION,
ADD COLUMN     "ironMg" DOUBLE PRECISION,
ADD COLUMN     "magnesiumMg" DOUBLE PRECISION,
ADD COLUMN     "nameEn" TEXT NOT NULL,
ADD COLUMN     "phosphorusMg" DOUBLE PRECISION,
ADD COLUMN     "portionGrams" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "portionName" TEXT NOT NULL,
ADD COLUMN     "potassiumMg" DOUBLE PRECISION,
ADD COLUMN     "source" TEXT NOT NULL,
ADD COLUMN     "vitaminB12Ug" DOUBLE PRECISION,
ADD COLUMN     "vitaminCMg" DOUBLE PRECISION,
ADD COLUMN     "vitaminDUg" DOUBLE PRECISION,
ADD COLUMN     "vitaminKUg" DOUBLE PRECISION,
ADD COLUMN     "zincMg" DOUBLE PRECISION,
ALTER COLUMN "saturatedFat" DROP NOT NULL,
ALTER COLUMN "sugars" DROP NOT NULL,
ALTER COLUMN "sodiumMg" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Food_fdcId_key" ON "Food"("fdcId");

-- CreateIndex
CREATE INDEX "Food_name_idx" ON "Food"("name");
