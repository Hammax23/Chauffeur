-- Multi-device Expo push tokens (Customer / Driver)
CREATE TABLE IF NOT EXISTS "PushDevice" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushDevice_token_key" ON "PushDevice"("token");
CREATE INDEX IF NOT EXISTS "PushDevice_role_userId_idx" ON "PushDevice"("role", "userId");

-- Backfill from legacy single-token columns
INSERT INTO "PushDevice" ("id", "role", "userId", "token", "platform", "updatedAt", "createdAt")
SELECT
  md5('CUSTOMER:' || c."id" || ':' || c."pushToken"),
  'CUSTOMER',
  c."id",
  c."pushToken",
  NULL,
  NOW(),
  NOW()
FROM "Customer" c
WHERE c."pushToken" IS NOT NULL AND c."pushToken" <> ''
ON CONFLICT ("token") DO NOTHING;

INSERT INTO "PushDevice" ("id", "role", "userId", "token", "platform", "updatedAt", "createdAt")
SELECT
  md5('DRIVER:' || d."id" || ':' || d."pushToken"),
  'DRIVER',
  d."id",
  d."pushToken",
  NULL,
  NOW(),
  NOW()
FROM "Driver" d
WHERE d."pushToken" IS NOT NULL AND d."pushToken" <> ''
ON CONFLICT ("token") DO NOTHING;
