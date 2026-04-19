-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "dateSubmitted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "vehicle" TEXT NOT NULL,
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "childSeats" INTEGER NOT NULL DEFAULT 0,
    "childSeatType" TEXT,
    "etr407" TEXT NOT NULL DEFAULT 'No',
    "serviceDate" TEXT NOT NULL,
    "serviceTime" TEXT NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "stops" TEXT,
    "dropoffLocation" TEXT NOT NULL,
    "distance" TEXT,
    "duration" TEXT,
    "airline" TEXT,
    "flightNumber" TEXT,
    "flightNote" TEXT,
    "rideFare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stopCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "childSeatCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gratuity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specialRequirements" TEXT,
    "driverLink" TEXT,
    "trackLink" TEXT,
    "completedAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripePaymentMethodId" TEXT,
    "cardType" TEXT,
    "cardLast4" TEXT,
    "paymentStatus" TEXT DEFAULT 'PENDING',
    "assignedDriverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "vehicle" TEXT NOT NULL,
    "vehiclePlate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "photo" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_bookingId_key" ON "Reservation"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_driverId_key" ON "Driver"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_email_key" ON "Driver"("email");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
