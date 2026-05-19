-- Driver trip timing (OTW→DONE, Stop/Continue segments)
ALTER TABLE "Reservation" ADD COLUMN "driverOnTheWayAt" TIMESTAMP(3);
ALTER TABLE "Reservation" ADD COLUMN "driverStopPeriodsJson" TEXT;
