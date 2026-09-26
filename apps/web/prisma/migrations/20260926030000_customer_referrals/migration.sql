-- AlterTable
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "referredByCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_referralCode_key" ON "Customer"("referralCode");
CREATE INDEX IF NOT EXISTS "Customer_referredByCustomerId_idx" ON "Customer"("referredByCustomerId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Customer" ADD CONSTRAINT "Customer_referredByCustomerId_fkey" FOREIGN KEY ("referredByCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReferralAttribution" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "codeUsed" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "qualifiedAt" TIMESTAMP(3),
    "refereeFirstBookingId" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReferralReward" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "redeemedReservationId" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralAttribution_refereeId_key" ON "ReferralAttribution"("refereeId");
CREATE INDEX IF NOT EXISTS "ReferralAttribution_referrerId_status_idx" ON "ReferralAttribution"("referrerId", "status");
CREATE INDEX IF NOT EXISTS "ReferralAttribution_status_createdAt_idx" ON "ReferralAttribution"("status", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralReward_customerId_key" ON "ReferralReward"("customerId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralReward_redeemedReservationId_key" ON "ReferralReward"("redeemedReservationId");
CREATE INDEX IF NOT EXISTS "ReferralReward_status_idx" ON "ReferralReward"("status");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
