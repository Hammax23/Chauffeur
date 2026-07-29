-- Hotel Concierge Platform tables

CREATE TABLE IF NOT EXISTS "Hotel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "commissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Concierge" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Concierge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Concierge_email_key" ON "Concierge"("email");
CREATE INDEX IF NOT EXISTS "Concierge_hotelId_idx" ON "Concierge"("hotelId");

CREATE TABLE IF NOT EXISTS "ConciergeDriverProfile" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "membershipStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "membershipExpiresAt" TIMESTAMP(3),
    "vehicleClass" TEXT NOT NULL DEFAULT 'SEDAN',
    "vehicleLabel" TEXT NOT NULL DEFAULT '',
    "availability" TEXT NOT NULL DEFAULT 'OFFLINE',
    "referralEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConciergeDriverProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConciergeDriverProfile_driverId_key" ON "ConciergeDriverProfile"("driverId");
CREATE INDEX IF NOT EXISTS "ConciergeDriverProfile_availability_membershipStatus_idx" ON "ConciergeDriverProfile"("availability", "membershipStatus");
CREATE INDEX IF NOT EXISTS "ConciergeDriverProfile_vehicleClass_idx" ON "ConciergeDriverProfile"("vehicleClass");

CREATE TABLE IF NOT EXISTS "ConciergeRideRequest" (
    "id" TEXT NOT NULL,
    "requestCode" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "conciergeId" TEXT NOT NULL,
    "assignedDriverId" TEXT,
    "guestName" TEXT NOT NULL DEFAULT '',
    "guestPhone" TEXT NOT NULL DEFAULT '',
    "pickupLocation" TEXT NOT NULL,
    "dropoffLocation" TEXT NOT NULL DEFAULT '',
    "notes" TEXT,
    "vehicleRequestRule" TEXT NOT NULL,
    "guestPaymentMethod" TEXT NOT NULL DEFAULT 'UNSET',
    "fare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hotelCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "ConciergeRideRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConciergeRideRequest_requestCode_key" ON "ConciergeRideRequest"("requestCode");
CREATE INDEX IF NOT EXISTS "ConciergeRideRequest_status_createdAt_idx" ON "ConciergeRideRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ConciergeRideRequest_conciergeId_idx" ON "ConciergeRideRequest"("conciergeId");
CREATE INDEX IF NOT EXISTS "ConciergeRideRequest_hotelId_idx" ON "ConciergeRideRequest"("hotelId");
CREATE INDEX IF NOT EXISTS "ConciergeRideRequest_assignedDriverId_idx" ON "ConciergeRideRequest"("assignedDriverId");

CREATE TABLE IF NOT EXISTS "CommissionConfirmation" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "driverClaim" TEXT NOT NULL DEFAULT 'UNSET',
    "conciergeClaim" TEXT NOT NULL DEFAULT 'UNSET',
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "disputeOpen" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommissionConfirmation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommissionConfirmation_rideId_key" ON "CommissionConfirmation"("rideId");

CREATE TABLE IF NOT EXISTS "ConciergeRating" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "fromRole" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toRole" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "note" TEXT,
    "conciergeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConciergeRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConciergeRating_rideId_fromRole_fromId_key" ON "ConciergeRating"("rideId", "fromRole", "fromId");
CREATE INDEX IF NOT EXISTS "ConciergeRating_rideId_idx" ON "ConciergeRating"("rideId");

DO $$ BEGIN
  ALTER TABLE "Concierge" ADD CONSTRAINT "Concierge_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConciergeDriverProfile" ADD CONSTRAINT "ConciergeDriverProfile_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConciergeRideRequest" ADD CONSTRAINT "ConciergeRideRequest_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConciergeRideRequest" ADD CONSTRAINT "ConciergeRideRequest_conciergeId_fkey" FOREIGN KEY ("conciergeId") REFERENCES "Concierge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConciergeRideRequest" ADD CONSTRAINT "ConciergeRideRequest_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "ConciergeDriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CommissionConfirmation" ADD CONSTRAINT "CommissionConfirmation_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "ConciergeRideRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConciergeRating" ADD CONSTRAINT "ConciergeRating_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "ConciergeRideRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConciergeRating" ADD CONSTRAINT "ConciergeRating_conciergeId_fkey" FOREIGN KEY ("conciergeId") REFERENCES "Concierge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
