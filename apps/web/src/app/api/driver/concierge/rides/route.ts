import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyDriverToken } from "@/lib/driver-auth";
import {
  canDriverAcceptRule,
  isMembershipActive,
  syncCommissionMatch,
} from "@/lib/concierge-rules";

async function getProfile(driverId: string) {
  return prisma.conciergeDriverProfile.findUnique({
    where: { driverId },
    include: { driver: { select: { name: true, phone: true, rating: true } } },
  });
}

export async function GET(req: NextRequest) {
  const auth = await verifyDriverToken(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfile(auth.id);
  if (!profile) {
    return NextResponse.json({
      success: true,
      enrolled: false,
      openRequests: [],
      myRides: [],
      profile: null,
    });
  }

  const tab = new URL(req.url).searchParams.get("tab") || "open";

  if (tab === "open") {
    const eligible =
      profile.availability === "ONLINE" &&
      isMembershipActive(profile.membershipStatus, profile.membershipExpiresAt);

    const open = eligible
      ? await prisma.conciergeRideRequest.findMany({
          where: { status: "OPEN" },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            hotel: { select: { name: true, city: true } },
            concierge: { select: { name: true, phone: true } },
          },
        })
      : [];

    const filtered = open.filter((r) =>
      canDriverAcceptRule(profile.vehicleClass, r.vehicleRequestRule, profile.vehicleLabel)
    );

    return NextResponse.json({
      success: true,
      enrolled: true,
      profile,
      openRequests: filtered,
    });
  }

  const myRides = await prisma.conciergeRideRequest.findMany({
    where: { assignedDriverId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      hotel: { select: { name: true } },
      concierge: { select: { name: true, phone: true } },
      commission: true,
      ratings: true,
    },
  });

  return NextResponse.json({ success: true, enrolled: true, profile, myRides });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyDriverToken(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfile(auth.id);
  if (!profile) {
    return NextResponse.json({ success: false, error: "Not enrolled in Concierge network" }, { status: 403 });
  }

  const body = await req.json();

  // Availability toggle (ONLINE / OFFLINE only from driver)
  if (body.action === "set_availability") {
    if (profile.availability === "BUSY") {
      return NextResponse.json({ success: false, error: "Finish active trip first" }, { status: 409 });
    }
    const availability = body.availability === "ONLINE" ? "ONLINE" : "OFFLINE";
    const updated = await prisma.conciergeDriverProfile.update({
      where: { id: profile.id },
      data: { availability },
    });
    return NextResponse.json({ success: true, profile: updated });
  }

  // Accept ride
  if (body.action === "accept") {
    const rideId = String(body.rideId || "");
    if (!isMembershipActive(profile.membershipStatus, profile.membershipExpiresAt)) {
      return NextResponse.json({ success: false, error: "Membership expired" }, { status: 403 });
    }
    if (profile.availability !== "ONLINE") {
      return NextResponse.json({ success: false, error: "Go Online to accept rides" }, { status: 403 });
    }

    const ride = await prisma.conciergeRideRequest.findUnique({ where: { id: rideId } });
    if (!ride || ride.status !== "OPEN") {
      return NextResponse.json({ success: false, error: "Request no longer available" }, { status: 409 });
    }
    if (!canDriverAcceptRule(profile.vehicleClass, ride.vehicleRequestRule, profile.vehicleLabel)) {
      return NextResponse.json({ success: false, error: "Vehicle not eligible for this request" }, { status: 403 });
    }

    const claimed = await prisma.conciergeRideRequest.updateMany({
      where: { id: rideId, status: "OPEN" },
      data: { status: "ASSIGNED", assignedDriverId: profile.id },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ success: false, error: "Request no longer available" }, { status: 409 });
    }

    await prisma.conciergeDriverProfile.update({
      where: { id: profile.id },
      data: { availability: "BUSY" },
    });

    const updated = await prisma.conciergeRideRequest.findUnique({
      where: { id: rideId },
      include: {
        hotel: true,
        concierge: { select: { name: true, phone: true } },
        commission: true,
      },
    });

    return NextResponse.json({ success: true, ride: updated });
  }

  // Trip status
  if (body.action === "status") {
    const rideId = String(body.rideId || "");
    const status = String(body.status || "");
    const allowed = ["ON_THE_WAY", "ARRIVED", "IN_TRIP", "COMPLETED", "CANCELLED"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    const ride = await prisma.conciergeRideRequest.findFirst({
      where: { id: rideId, assignedDriverId: profile.id },
    });
    if (!ride) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    const updated = await prisma.conciergeRideRequest.update({
      where: { id: rideId },
      data: {
        status,
        ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
      },
    });

    if (status === "COMPLETED" || status === "CANCELLED") {
      await prisma.conciergeDriverProfile.update({
        where: { id: profile.id },
        data: { availability: "ONLINE" },
      });
    }

    return NextResponse.json({ success: true, ride: updated });
  }

  // Commission
  if (body.action === "commission") {
    const rideId = String(body.rideId || "");
    const claim = body.driverClaim === "PAID" ? "PAID" : "NOT_PAID";
    const ride = await prisma.conciergeRideRequest.findFirst({
      where: { id: rideId, assignedDriverId: profile.id },
      include: { commission: true },
    });
    if (!ride) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    const conciergeClaim = ride.commission?.conciergeClaim || "UNSET";
    const sync = syncCommissionMatch(claim, conciergeClaim);
    const commission = await prisma.commissionConfirmation.upsert({
      where: { rideId },
      create: {
        rideId,
        driverClaim: claim,
        conciergeClaim,
        matched: sync.matched,
        disputeOpen: sync.disputeOpen,
      },
      update: {
        driverClaim: claim,
        matched: sync.matched,
        disputeOpen: sync.disputeOpen,
      },
    });
    if (sync.disputeOpen) {
      void import("@/lib/concierge-push")
        .then(({ notifyCommissionDispute }) => notifyCommissionDispute(rideId))
        .catch(() => {});
    }
    return NextResponse.json({ success: true, commission });
  }

  // Rate concierge
  if (body.action === "rate") {
    const rideId = String(body.rideId || "");
    const stars = Math.min(5, Math.max(1, Number(body.stars) || 5));
    const ride = await prisma.conciergeRideRequest.findFirst({
      where: { id: rideId, assignedDriverId: profile.id },
    });
    if (!ride) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    const rating = await prisma.conciergeRating.upsert({
      where: {
        rideId_fromRole_fromId: {
          rideId,
          fromRole: "DRIVER",
          fromId: auth.id,
        },
      },
      create: {
        rideId,
        fromRole: "DRIVER",
        fromId: auth.id,
        toRole: "CONCIERGE",
        toId: ride.conciergeId,
        stars,
        note: body.note ? String(body.note) : null,
      },
      update: { stars, note: body.note ? String(body.note) : null },
    });
    return NextResponse.json({ success: true, rating });
  }

  return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
}
