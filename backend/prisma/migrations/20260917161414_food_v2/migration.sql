/*
  Warnings:

  - You are about to drop the column `cholesterol` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `hasLactose` on the `Food` table. All the data in the column will be lost.
  - You are about to drop the column `sodium` on the `Food` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `Food` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Food` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sodiumMg` to the `Food` table without a default value. This is not possible if the table is not empty.
  - Made the column `fat` on table `Food` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saturatedFat` on table `Food` required. This step will fail if there are existing NULL values in that column.
  - Made the column `carbohydrates` on table `Food` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sugars` on table `Food` required. This step will fail if there are existing NULL values in that column.
  - Made the column `proteins` on table `Food` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Food" DROP COLUMN "cholesterol",
DROP COLUMN "hasLactose",
DROP COLUMN "sodium",
ADD COLUMN     "allergenInfoKnown" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allergens" TEXT[],
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "cholesterolMg" DOUBLE PRECISION,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "hasMilk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasMilkTrace" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTurkish" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "labeledGlutenFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "labeledLactoseFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nameLang" TEXT,
ADD COLUMN     "saltG" DOUBLE PRECISION,
ADD COLUMN     "sodiumMg" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "traces" TEXT[],
ADD COLUMN     "uniqueScans" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "fat" SET NOT NULL,
ALTER COLUMN "saturatedFat" SET NOT NULL,
ALTER COLUMN "carbohydrates" SET NOT NULL,
ALTER COLUMN "sugars" SET NOT NULL,
ALTER COLUMN "proteins" SET NOT NULL,
ALTER COLUMN "nutriscoreGrade" DROP DEFAULT,
ALTER COLUMN "novaGroup" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Food_code_key" ON "Food"("code");

-- CreateIndex
CREATE INDEX "Food_category_idx" ON "Food"("category");
