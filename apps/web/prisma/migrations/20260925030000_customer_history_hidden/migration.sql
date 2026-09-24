-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "customerHistoryHiddenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Reservation_customerId_customerHistoryHiddenAt_idx" ON "Reservation"("customerId", "customerHistoryHiddenAt");
