-- SEO panel enhancements: blog content format, managed cities/services, audit log

-- AlterTable BlogPost
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "contentFormat" TEXT NOT NULL DEFAULT 'plain';

-- CreateTable ManagedCity
CREATE TABLE IF NOT EXISTS "ManagedCity" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable ManagedService
CREATE TABLE IF NOT EXISTS "ManagedService" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDesc" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "icon" TEXT NOT NULL DEFAULT 'Car',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedService_pkey" PRIMARY KEY ("id")
);

-- CreateTable SeoAuditLog
CREATE TABLE IF NOT EXISTS "SeoAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "entityLabel" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ManagedCity_slug_key" ON "ManagedCity"("slug");
CREATE INDEX IF NOT EXISTS "ManagedCity_isActive_sortOrder_idx" ON "ManagedCity"("isActive", "sortOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "ManagedService_slug_key" ON "ManagedService"("slug");
CREATE INDEX IF NOT EXISTS "ManagedService_isActive_sortOrder_idx" ON "ManagedService"("isActive", "sortOrder");

CREATE INDEX IF NOT EXISTS "SeoAuditLog_entityType_createdAt_idx" ON "SeoAuditLog"("entityType", "createdAt");
CREATE INDEX IF NOT EXISTS "SeoAuditLog_createdAt_idx" ON "SeoAuditLog"("createdAt");
