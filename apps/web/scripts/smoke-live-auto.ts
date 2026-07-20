/**
 * Smoke test: Live Auto Mode claim race + settings.
 * Run: npx tsx scripts/smoke-live-auto.ts  (from apps/web)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const prisma = new PrismaClient();
  const stamp = Date.now();
  const bookingId = `LA-SMOKE-${stamp}`;

  try {
    // Ensure settings row
    await prisma.opsSettings.upsert({
      where: { id: "global" },
      create: { id: "global", liveAutoMode: true, onlyActiveDrivers: true },
      update: { liveAutoMode: true, onlyActiveDrivers: true },
    });

    const password = await bcrypt.hash("SmokeTest123!", 12);
    const d1 = await prisma.driver.create({
      data: {
        driverId: `SMK1-${stamp}`,
        name: "Smoke Driver One",
        phone: "4161110001",
        email: `smoke1.${stamp}@test.local`,
        password,
        vehicle: "Test Sedan",
        vehiclePlate: "SMK1",
        isActive: true,
        status: "available",
      },
    });
    const d2 = await prisma.driver.create({
      data: {
        driverId: `SMK2-${stamp}`,
        name: "Smoke Driver Two",
        phone: "4161110002",
        email: `smoke2.${stamp}@test.local`,
        password,
        vehicle: "Test Sedan",
        vehiclePlate: "SMK2",
        isActive: true,
        status: "available",
      },
    });

    await prisma.reservation.create({
      data: {
        bookingId,
        status: "PENDING",
        firstName: "Smoke",
        lastName: "Test",
        email: `smoke.cust.${stamp}@test.local`,
        phone: "4160001111",
        serviceType: "Point-to-Point",
        vehicle: "Sedan",
        passengers: 2,
        serviceDate: "2026-07-20",
        serviceTime: "10:00",
        pickupLocation: "Toronto Pearson",
        dropoffLocation: "Downtown Toronto",
        total: 100,
      },
    });

    await prisma.rideOffer.createMany({
      data: [
        { bookingId, driverId: d1.id, status: "OPEN" },
        { bookingId, driverId: d2.id, status: "OPEN" },
      ],
    });

    // Dynamic import after DB is ready (uses same prisma singleton in app — test via raw race)
    const { claimLiveOffer, revokeOffersForBooking, getOpsSettings } = await import(
      "../src/lib/live-auto"
    );

    const settings = await getOpsSettings();
    if (!settings.liveAutoMode) throw new Error("liveAutoMode should be on");

    const [a, b] = await Promise.all([
      claimLiveOffer(bookingId, d1.id),
      claimLiveOffer(bookingId, d2.id),
    ]);

    const wins = [a, b].filter((r) => r.ok).length;
    const losses = [a, b].filter((r) => !r.ok).length;
    if (wins !== 1 || losses !== 1) {
      throw new Error(`Race failed: wins=${wins} losses=${losses} a=${JSON.stringify(a)} b=${JSON.stringify(b)}`);
    }

    const reservation = await prisma.reservation.findUnique({ where: { bookingId } });
    if (!reservation?.assignedDriverId || reservation.status !== "ACCEPTED") {
      throw new Error("Reservation not properly claimed");
    }

    const openLeft = await prisma.rideOffer.count({
      where: { bookingId, status: "OPEN" },
    });
    if (openLeft !== 0) throw new Error(`Expected 0 OPEN offers, got ${openLeft}`);

    // Manual-assign revoke path: create another booking
    const bookingId2 = `LA-SMOKE2-${stamp}`;
    await prisma.reservation.create({
      data: {
        bookingId: bookingId2,
        status: "PENDING",
        firstName: "Smoke",
        lastName: "Two",
        email: `smoke.cust2.${stamp}@test.local`,
        phone: "4160002222",
        serviceType: "Point-to-Point",
        vehicle: "Sedan",
        passengers: 1,
        serviceDate: "2026-07-21",
        serviceTime: "11:00",
        pickupLocation: "Oakville",
        dropoffLocation: "Mississauga",
        total: 80,
      },
    });
    await prisma.rideOffer.createMany({
      data: [
        { bookingId: bookingId2, driverId: d1.id, status: "OPEN" },
        { bookingId: bookingId2, driverId: d2.id, status: "OPEN" },
      ],
    });
    await prisma.reservation.update({
      where: { bookingId: bookingId2 },
      data: { assignedDriverId: d1.id },
    });
    await revokeOffersForBooking(bookingId2, d1.id);

    const open2 = await prisma.rideOffer.count({
      where: { bookingId: bookingId2, status: "OPEN" },
    });
    const claimedWinner = await prisma.rideOffer.findUnique({
      where: { bookingId_driverId: { bookingId: bookingId2, driverId: d1.id } },
    });
    if (open2 !== 0) throw new Error(`Manual assign left ${open2} OPEN offers`);
    if (claimedWinner?.status !== "CLAIMED") {
      throw new Error(`Winner offer should be CLAIMED, got ${claimedWinner?.status}`);
    }

    console.log("SMOKE_OK", {
      raceWinner: reservation.assignedDriverId === d1.id ? "d1" : "d2",
      openLeft,
      manualAssignClean: true,
    });
  } finally {
    // cleanup
    await prisma.rideOffer.deleteMany({
      where: { bookingId: { startsWith: `LA-SMOKE` } },
    });
    await prisma.reservation.deleteMany({
      where: { bookingId: { startsWith: `LA-SMOKE` } },
    });
    await prisma.driver.deleteMany({
      where: { email: { endsWith: "@test.local" } },
    });
    await prisma.opsSettings.update({
      where: { id: "global" },
      data: { liveAutoMode: false },
    });
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("SMOKE_FAIL", e);
  process.exit(1);
});
