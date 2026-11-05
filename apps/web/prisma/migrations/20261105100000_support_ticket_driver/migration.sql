-- AlterTable: allow driver-originated support tickets (customerId becomes optional)
ALTER TABLE "SupportTicket" ALTER COLUMN "customerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "driverId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_driverId_idx" ON "SupportTicket"("driverId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SupportTicket_driverId_fkey'
  ) THEN
    ALTER TABLE "SupportTicket"
      ADD CONSTRAINT "SupportTicket_driverId_fkey"
      FOREIGN KEY ("driverId") REFERENCES "Driver"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
