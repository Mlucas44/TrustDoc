-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASE');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "analyses" ADD COLUMN     "typeConfidence" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "credit_ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "credits" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "pack" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency" (
    "key" TEXT NOT NULL,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'PENDING',
    "fingerprint" TEXT NOT NULL,
    "resultId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_ledger_stripeEventId_key" ON "credit_ledger"("stripeEventId");

-- CreateIndex
CREATE INDEX "credit_ledger_userId_createdAt_idx" ON "credit_ledger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "credit_ledger_stripeEventId_idx" ON "credit_ledger"("stripeEventId");

-- CreateIndex
CREATE INDEX "idempotency_key_idx" ON "idempotency"("key");

-- CreateIndex
CREATE INDEX "idempotency_status_idx" ON "idempotency"("status");

-- CreateIndex
CREATE INDEX "idempotency_createdAt_idx" ON "idempotency"("createdAt");

-- CreateIndex
CREATE INDEX "idempotency_expiresAt_idx" ON "idempotency"("expiresAt");

-- AddForeignKey
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
