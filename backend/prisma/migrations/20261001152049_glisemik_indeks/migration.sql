-- AlterTable
ALTER TABLE "DiseaseRule" ADD COLUMN     "exemptFiberDensity" DOUBLE PRECISION,
ADD COLUMN     "exemptIfGlycemicLoadKnown" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "exemptUnsaturatedPct" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Food" ADD COLUMN     "glycemicIndex" DOUBLE PRECISION;
