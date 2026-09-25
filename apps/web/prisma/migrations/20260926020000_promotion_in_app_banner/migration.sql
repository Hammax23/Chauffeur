-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "showInApp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "bannerTitle" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "bannerMessage" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "Promotion_isActive_startsAt_endsAt_idx";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Promotion_isActive_showInApp_startsAt_endsAt_idx" ON "Promotion"("isActive", "showInApp", "startsAt", "endsAt");
