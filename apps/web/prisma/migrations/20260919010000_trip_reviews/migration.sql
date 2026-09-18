-- CreateTable
CREATE TABLE "TripReview" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TripReview_reservationId_key" ON "TripReview"("reservationId");

-- CreateIndex
CREATE INDEX "TripReview_driverId_createdAt_idx" ON "TripReview"("driverId", "createdAt");

-- CreateIndex
CREATE INDEX "TripReview_customerId_idx" ON "TripReview"("customerId");

-- CreateIndex
CREATE INDEX "TripReview_bookingId_idx" ON "TripReview"("bookingId");

-- AddForeignKey
ALTER TABLE "TripReview" ADD CONSTRAINT "TripReview_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripReview" ADD CONSTRAINT "TripReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripReview" ADD CONSTRAINT "TripReview_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
