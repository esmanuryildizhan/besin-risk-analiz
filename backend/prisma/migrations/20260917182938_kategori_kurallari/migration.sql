-- AlterTable
ALTER TABLE "DiseaseRule" ADD COLUMN     "categories" TEXT[],
ADD COLUMN     "critical" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "nutrient" DROP NOT NULL,
ALTER COLUMN "op" DROP NOT NULL,
ALTER COLUMN "threshold" DROP NOT NULL;
