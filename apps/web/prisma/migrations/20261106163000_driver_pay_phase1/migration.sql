-- Driver Pay (Phase 1) — DriverPaySettings, DriverEarning, DriverRemittance,
-- DriverPayout, DriverAdjustment, DriverPayAuditLog + Driver.commissionPctOverride.

-- ───── Driver extras ─────
ALTER TABLE "Driver"
  ADD COLUMN IF NOT EXISTS "commissionPctOverride" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "payoutNotes" TEXT;

-- ───── DriverPaySettings (singleton id = 'global') ─────
CREATE TABLE IF NOT EXISTS "DriverPaySettings" (
  "id" TEXT NOT NULL,
  "defaultPlatformCommissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
  "payoutCurrency" TEXT NOT NULL DEFAULT 'CAD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverPaySettings_pkey" PRIMARY KEY ("id")
);

-- ───── DriverPayout ─────
CREATE TABLE IF NOT EXISTS "DriverPayout" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "method" TEXT NOT NULL DEFAULT 'INTERAC',
  "reference" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "idempotencyKey" TEXT,
  "paidAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancelledReason" TEXT,
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverPayout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DriverPayout_idempotencyKey_key"
  ON "DriverPayout" ("idempotencyKey");
CREATE INDEX IF NOT EXISTS "DriverPayout_driverId_status_createdAt_idx"
  ON "DriverPayout" ("driverId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "DriverPayout_status_createdAt_idx"
  ON "DriverPayout" ("status", "createdAt");
ALTER TABLE "DriverPayout"
  ADD CONSTRAINT "DriverPayout_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ───── DriverEarning ─────
CREATE TABLE IF NOT EXISTS "DriverEarning" (
  "id" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "holdReason" TEXT,
  "needsReview" BOOLEAN NOT NULL DEFAULT false,
  "reviewReason" TEXT,
  "reviewNotes" TEXT,
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "gratuity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "hst" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "serviceBasis" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "driverNet" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "payoutId" TEXT,
  "completedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverEarning_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DriverEarning_reservationId_key"
  ON "DriverEarning" ("reservationId");
CREATE INDEX IF NOT EXISTS "DriverEarning_driverId_status_completedAt_idx"
  ON "DriverEarning" ("driverId", "status", "completedAt");
CREATE INDEX IF NOT EXISTS "DriverEarning_status_completedAt_idx"
  ON "DriverEarning" ("status", "completedAt");
CREATE INDEX IF NOT EXISTS "DriverEarning_payoutId_idx"
  ON "DriverEarning" ("payoutId");
CREATE INDEX IF NOT EXISTS "DriverEarning_needsReview_status_idx"
  ON "DriverEarning" ("needsReview", "status");
CREATE INDEX IF NOT EXISTS "DriverEarning_bookingId_idx"
  ON "DriverEarning" ("bookingId");
ALTER TABLE "DriverEarning"
  ADD CONSTRAINT "DriverEarning_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverEarning"
  ADD CONSTRAINT "DriverEarning_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DriverEarning"
  ADD CONSTRAINT "DriverEarning_payoutId_fkey"
  FOREIGN KEY ("payoutId") REFERENCES "DriverPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ───── DriverRemittance ─────
CREATE TABLE IF NOT EXISTS "DriverRemittance" (
  "id" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OWED',
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "gratuity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "hst" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "serviceBasis" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "amountOwed" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "method" TEXT,
  "reference" TEXT,
  "remittedAt" TIMESTAMP(3),
  "waivedAt" TIMESTAMP(3),
  "waivedReason" TEXT,
  "notes" TEXT,
  "completedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverRemittance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DriverRemittance_reservationId_key"
  ON "DriverRemittance" ("reservationId");
CREATE INDEX IF NOT EXISTS "DriverRemittance_driverId_status_completedAt_idx"
  ON "DriverRemittance" ("driverId", "status", "completedAt");
CREATE INDEX IF NOT EXISTS "DriverRemittance_status_completedAt_idx"
  ON "DriverRemittance" ("status", "completedAt");
CREATE INDEX IF NOT EXISTS "DriverRemittance_bookingId_idx"
  ON "DriverRemittance" ("bookingId");
ALTER TABLE "DriverRemittance"
  ADD CONSTRAINT "DriverRemittance_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverRemittance"
  ADD CONSTRAINT "DriverRemittance_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ───── DriverAdjustment ─────
CREATE TABLE IF NOT EXISTS "DriverAdjustment" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "earningId" TEXT,
  "payoutId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverAdjustment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DriverAdjustment_driverId_createdAt_idx"
  ON "DriverAdjustment" ("driverId", "createdAt");
CREATE INDEX IF NOT EXISTS "DriverAdjustment_payoutId_idx"
  ON "DriverAdjustment" ("payoutId");
ALTER TABLE "DriverAdjustment"
  ADD CONSTRAINT "DriverAdjustment_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DriverAdjustment"
  ADD CONSTRAINT "DriverAdjustment_payoutId_fkey"
  FOREIGN KEY ("payoutId") REFERENCES "DriverPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ───── DriverPayAuditLog ─────
CREATE TABLE IF NOT EXISTS "DriverPayAuditLog" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "details" JSONB,
  "actor" TEXT NOT NULL DEFAULT 'admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverPayAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DriverPayAuditLog_entityType_createdAt_idx"
  ON "DriverPayAuditLog" ("entityType", "createdAt");
CREATE INDEX IF NOT EXISTS "DriverPayAuditLog_createdAt_idx"
  ON "DriverPayAuditLog" ("createdAt");

-- Seed the singleton settings row (idempotent).
INSERT INTO "DriverPaySettings" ("id", "defaultPlatformCommissionPercent", "payoutCurrency", "createdAt", "updatedAt")
VALUES ('global', 20, 'CAD', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
