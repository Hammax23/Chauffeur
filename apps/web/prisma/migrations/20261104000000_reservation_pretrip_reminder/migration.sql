-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "preTripReminderSentAt" TIMESTAMP(3);
