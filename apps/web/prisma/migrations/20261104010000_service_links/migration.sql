-- CreateTable
CREATE TABLE IF NOT EXISTS "ServiceLink" (
    "id" TEXT NOT NULL,
    "serviceSlug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ServiceLink_serviceSlug_isActive_sortOrder_idx" ON "ServiceLink"("serviceSlug", "isActive", "sortOrder");
