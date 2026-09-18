-- AlterTable
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "blockedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "blockedReason" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_accountStatus_idx" ON "Customer"("accountStatus");
CREATE INDEX IF NOT EXISTS "Customer_registrationSource_idx" ON "Customer"("registrationSource");
