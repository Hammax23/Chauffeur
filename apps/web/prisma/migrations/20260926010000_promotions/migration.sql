-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Reservation" ADD COLUMN "promoCode" TEXT;

-- CreateIndex
CREATE INDEX "Reservation_promoCode_idx" ON "Reservation"("promoCode");

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "maxPerCustomer" INTEGER DEFAULT 1,
    "minSubtotal" DOUBLE PRECISION,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionRedemption" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");

-- CreateIndex
CREATE INDEX "Promotion_isActive_startsAt_endsAt_idx" ON "Promotion"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionRedemption_reservationId_key" ON "PromotionRedemption"("reservationId");

-- CreateIndex
CREATE INDEX "PromotionRedemption_promotionId_customerId_idx" ON "PromotionRedemption"("promotionId", "customerId");

-- CreateIndex
CREATE INDEX "PromotionRedemption_customerId_idx" ON "PromotionRedemption"("customerId");

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
