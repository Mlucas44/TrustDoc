-- CreateTable
CREATE TABLE "guest_quotas" (
    "id" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guest_quotas_id_idx" ON "guest_quotas"("id");

-- CreateIndex
CREATE INDEX "guest_quotas_createdAt_idx" ON "guest_quotas"("createdAt");

-- CreateIndex
CREATE INDEX "guest_quotas_expiresAt_idx" ON "guest_quotas"("expiresAt");
