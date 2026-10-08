-- CreateTable
CREATE TABLE "GuvenlikOlayi" (
    "id" SERIAL NOT NULL,
    "olay" TEXT NOT NULL,
    "zaman" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipOzeti" TEXT,
    "kullaniciId" INTEGER,
    "ayrinti" TEXT,

    CONSTRAINT "GuvenlikOlayi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuvenlikOlayi_zaman_idx" ON "GuvenlikOlayi"("zaman");

-- CreateIndex
CREATE INDEX "GuvenlikOlayi_olay_zaman_idx" ON "GuvenlikOlayi"("olay", "zaman");

-- CreateIndex
CREATE INDEX "GuvenlikOlayi_kullaniciId_zaman_idx" ON "GuvenlikOlayi"("kullaniciId", "zaman");
