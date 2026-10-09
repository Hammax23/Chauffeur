-- CreateTable
CREATE TABLE "CustomerSavedPlace" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerSavedPlace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerSavedPlace_customerId_idx" ON "CustomerSavedPlace"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSavedPlace_customerId_kind_key" ON "CustomerSavedPlace"("customerId", "kind");

-- AddForeignKey
ALTER TABLE "CustomerSavedPlace" ADD CONSTRAINT "CustomerSavedPlace_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
