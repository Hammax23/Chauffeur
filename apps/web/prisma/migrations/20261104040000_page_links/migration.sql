-- Service links are now only the "Related Guides" list; in-text links live in PageLink
ALTER TABLE "ServiceLink" DROP COLUMN IF EXISTS "keyword";
ALTER TABLE "ServiceLink" DROP COLUMN IF EXISTS "occurrence";

-- CreateTable
CREATE TABLE IF NOT EXISTS "PageLink" (
    "id" TEXT NOT NULL,
    "pagePath" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "occurrence" INTEGER NOT NULL DEFAULT 1,
    "newTab" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PageLink_pagePath_isActive_idx" ON "PageLink"("pagePath", "isActive");
