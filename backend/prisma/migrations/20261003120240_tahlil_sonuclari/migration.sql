-- AlterTable
ALTER TABLE "LabResult" ADD COLUMN     "pdfAralik" TEXT,
ADD COLUMN     "pdfYorumu" TEXT,
ADD COLUMN     "textValue" TEXT,
ADD COLUMN     "valueOp" TEXT,
ALTER COLUMN "value" DROP NOT NULL,
ALTER COLUMN "unit" DROP NOT NULL;
