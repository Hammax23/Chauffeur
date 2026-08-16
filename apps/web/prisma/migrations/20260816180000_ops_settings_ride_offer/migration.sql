-- Live Auto Mode settings + per-driver ride offers
CREATE TABLE IF NOT EXISTS "OpsSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "liveAutoMode" BOOLEAN NOT NULL DEFAULT false,
    "onlyActiveDrivers" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpsSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RideOffer" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideOffer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RideOffer_bookingId_driverId_key" ON "RideOffer"("bookingId", "driverId");
CREATE INDEX IF NOT EXISTS "RideOffer_driverId_status_idx" ON "RideOffer"("driverId", "status");
CREATE INDEX IF NOT EXISTS "RideOffer_bookingId_status_idx" ON "RideOffer"("bookingId", "status");
CREATE INDEX IF NOT EXISTS "RideOffer_status_idx" ON "RideOffer"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RideOffer_driverId_fkey'
  ) THEN
    ALTER TABLE "RideOffer"
      ADD CONSTRAINT "RideOffer_driverId_fkey"
      FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "OpsSettings" ("id", "liveAutoMode", "onlyActiveDrivers", "createdAt", "updatedAt")
VALUES ('global', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
