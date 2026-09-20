-- Soft-delete support for customer self-deactivation.
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP(3);
