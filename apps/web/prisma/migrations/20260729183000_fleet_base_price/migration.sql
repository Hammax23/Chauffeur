-- AlterTable
ALTER TABLE "FleetVehicle" ADD COLUMN IF NOT EXISTS "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill: previous dual-use hourlyRate becomes distance base price
UPDATE "FleetVehicle" SET "basePrice" = "hourlyRate" WHERE "basePrice" = 0 AND "hourlyRate" > 0;
