-- Driver Pay (Phase 2) — per-admin identity (AdminUser), Stripe Connect fields on Driver,
-- FareAdjustment snapshot on DriverEarning, Stripe Transfer id on DriverPayout,
-- DriverTaxYearSummary (T4A snapshot per calendar year).
-- All statements use IF NOT EXISTS / IF EXISTS so the migration is safe to re-run.

-- ───── AdminUser (per-admin identity for audit) ─────
CREATE TABLE IF NOT EXISTS "AdminUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_email_key" ON "AdminUser" ("email");
CREATE INDEX IF NOT EXISTS "AdminUser_isActive_idx" ON "AdminUser" ("isActive");

-- ───── Driver: Stripe Connect fields ─────
ALTER TABLE "Driver"
  ADD COLUMN IF NOT EXISTS "stripeConnectAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeConnectStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS "stripeConnectUpdatedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Driver_stripeConnectAccountId_key"
  ON "Driver" ("stripeConnectAccountId");

-- ───── DriverEarning: fareAdjustmentsTotal snapshot ─────
ALTER TABLE "DriverEarning"
  ADD COLUMN IF NOT EXISTS "fareAdjustmentsTotal" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ───── DriverPayout: Stripe Transfer id (Mark Paid via Connect) ─────
ALTER TABLE "DriverPayout"
  ADD COLUMN IF NOT EXISTS "stripeTransferId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "DriverPayout_stripeTransferId_key"
  ON "DriverPayout" ("stripeTransferId");

-- ───── DriverTaxYearSummary (T4A snapshot) ─────
CREATE TABLE IF NOT EXISTS "DriverTaxYearSummary" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "earningsPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "adjustmentsTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "earningsCount" INTEGER NOT NULL DEFAULT 0,
  "adjustmentsCount" INTEGER NOT NULL DEFAULT 0,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverTaxYearSummary_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DriverTaxYearSummary_driverId_year_key"
  ON "DriverTaxYearSummary" ("driverId", "year");
CREATE INDEX IF NOT EXISTS "DriverTaxYearSummary_year_idx"
  ON "DriverTaxYearSummary" ("year");
ALTER TABLE "DriverTaxYearSummary"
  DROP CONSTRAINT IF EXISTS "DriverTaxYearSummary_driverId_fkey";
ALTER TABLE "DriverTaxYearSummary"
  ADD CONSTRAINT "DriverTaxYearSummary_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
