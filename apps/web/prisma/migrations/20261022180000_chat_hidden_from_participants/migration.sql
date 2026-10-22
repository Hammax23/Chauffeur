-- Soft-hide trip chat from customer/driver after ride ends; admin keeps transcript.
ALTER TABLE "ChatThread" ADD COLUMN IF NOT EXISTS "hiddenFromParticipantsAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ChatThread_hiddenFromParticipantsAt_idx"
  ON "ChatThread"("hiddenFromParticipantsAt");

-- Backfill: hide threads for already-finished rides.
UPDATE "ChatThread" AS t
SET "hiddenFromParticipantsAt" = COALESCE(r."completedAt", t."updatedAt", NOW())
FROM "Reservation" AS r
WHERE t."reservationId" = r."id"
  AND t."hiddenFromParticipantsAt" IS NULL
  AND r."status" IN ('DONE', 'CANCELLED', 'CANCELED');
