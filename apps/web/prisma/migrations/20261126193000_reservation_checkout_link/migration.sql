-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "stripeCheckoutUrl" TEXT;
