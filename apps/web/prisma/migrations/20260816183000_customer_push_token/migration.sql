-- Optional customer push token (Expo)
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "pushToken" TEXT;
CREATE INDEX IF NOT EXISTS "Customer_pushToken_idx" ON "Customer"("pushToken");
