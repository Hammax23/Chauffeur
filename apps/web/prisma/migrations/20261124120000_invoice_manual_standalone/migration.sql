-- Standalone manual invoices (no reservation required)
ALTER TABLE "Invoice" ALTER COLUMN "reservationId" DROP NOT NULL;

-- Drop old cascade FK if present, recreate as SET NULL
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_reservationId_fkey";
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'RESERVATION';

CREATE INDEX IF NOT EXISTS "Invoice_source_idx" ON "Invoice"("source");
