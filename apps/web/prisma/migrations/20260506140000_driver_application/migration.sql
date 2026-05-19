-- CreateTable
CREATE TABLE "DriverApplication" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "rejectionReason" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "vehicle" TEXT NOT NULL,
    "vehiclePlate" TEXT NOT NULL,
    "photo" TEXT,
    "backgroundCheckUrl" TEXT,
    "commercialInsuranceUrl" TEXT,
    "driverLicenceUrl" TEXT,
    "proofOfWorkEligibilityUrl" TEXT,
    "municipalTaxiLimoLicenceUrl" TEXT,
    "vehicleInsuranceUrl" TEXT,
    "vehicleRegistrationUrl" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriverApplication_status_submittedAt_idx" ON "DriverApplication"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DriverApplication_inviteId_key" ON "DriverApplication"("inviteId");

-- AddForeignKey
ALTER TABLE "DriverApplication" ADD CONSTRAINT "DriverApplication_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "DriverInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

