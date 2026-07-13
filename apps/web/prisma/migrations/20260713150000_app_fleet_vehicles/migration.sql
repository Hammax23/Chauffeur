-- CreateTable
CREATE TABLE "AppFleetVehicle" (
    "id" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "group" TEXT NOT NULL DEFAULT 'standard',
    "category" TEXT NOT NULL DEFAULT 'Sedan',
    "seating" TEXT NOT NULL DEFAULT '',
    "luggage" TEXT NOT NULL DEFAULT '',
    "pricePerKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "showOnHome" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppFleetVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppFleetVehicle_tierId_key" ON "AppFleetVehicle"("tierId");

-- CreateIndex
CREATE INDEX "AppFleetVehicle_isActive_sortOrder_idx" ON "AppFleetVehicle"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "AppFleetVehicle_group_isActive_idx" ON "AppFleetVehicle"("group", "isActive");
