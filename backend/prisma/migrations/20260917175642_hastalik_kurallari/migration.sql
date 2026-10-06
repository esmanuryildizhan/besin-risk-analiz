-- CreateTable
CREATE TABLE "Disease" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "note" TEXT,
    "evaluable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Disease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiseaseRule" (
    "id" SERIAL NOT NULL,
    "diseaseKey" TEXT NOT NULL,
    "nutrient" TEXT NOT NULL,
    "op" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "basis" TEXT NOT NULL DEFAULT '100g',
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DiseaseRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Disease_key_key" ON "Disease"("key");

-- CreateIndex
CREATE INDEX "DiseaseRule_diseaseKey_idx" ON "DiseaseRule"("diseaseKey");

-- AddForeignKey
ALTER TABLE "DiseaseRule" ADD CONSTRAINT "DiseaseRule_diseaseKey_fkey" FOREIGN KEY ("diseaseKey") REFERENCES "Disease"("key") ON DELETE CASCADE ON UPDATE CASCADE;
