import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyConciergeToken } from "@/lib/concierge-auth";
import {
  computePlatformFee,
  syncCommissionMatch,
} from "@/lib/concierge-rules";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await verifyConciergeToken(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const ride = await prisma.conciergeRideRequest.findFirst({
    where: { id, conciergeId: auth.id },
    include: {
      hotel: true,
      assignedDriverProfile: {
        include: {
          driver: {
            select: {
              name: true,
              phone: true,
              vehicle: true,
              vehiclePlate: true,
              lastLatitude: true,
              lastLongitude: true,
              lastLocationUpdatedAt: true,
              rating: true,
            },
          },
        },
      },
      commission: true,
      ratings: true,
    },
  });

  if (!ride) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, ride });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await verifyConciergeToken(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const ride = await prisma.conciergeRideRequest.findFirst({
    where: { id, conciergeId: auth.id },
    include: { commission: true, hotel: true },
  });

  if (!ride) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  try {
    // Cancel open/assigned
    if (body.action === "cancel" && ["OPEN", "ASSIGNED"].includes(ride.status)) {
      const updated = await prisma.conciergeRideRequest.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      if (ride.assignedDriverId) {
        await prisma.conciergeDriverProfile.update({
          where: { id: ride.assignedDriverId },
          data: { availability: "ONLINE" },
        });
      }
      return NextResponse.json({ success: true, ride: updated });
    }

    // Record guest payment
    if (body.action === "set_payment") {
      const method = body.guestPaymentMethod === "APP" ? "APP" : "CASH";
      const platformFee = computePlatformFee(ride.fare, method);
      const updated = await prisma.conciergeRideRequest.update({
        where: { id },
        data: { guestPaymentMethod: method, platformFee },
        include: { commission: true },
      });
      return NextResponse.json({ success: true, ride: updated });
    }

    // Commission claim
    if (body.action === "commission") {
      const claim =
        body.conciergeClaim === "RECEIVED" ? "RECEIVED" : "NOT_RECEIVED";
      const driverClaim = ride.commission?.driverClaim || "UNSET";
      const sync = syncCommissionMatch(driverClaim, claim);
      const commission = await prisma.commissionConfirmation.upsert({
        where: { rideId: id },
        create: {
          rideId: id,
          conciergeClaim: claim,
          driverClaim,
          matched: sync.matched,
          disputeOpen: sync.disputeOpen,
        },
        update: {
          conciergeClaim: claim,
          matched: sync.matched,
          disputeOpen: sync.disputeOpen,
        },
      });
      if (sync.disputeOpen) {
        void import("@/lib/concierge-push")
          .then(({ notifyCommissionDispute }) => notifyCommissionDispute(id))
          .catch(() => {});
      }
      return NextResponse.json({ success: true, commission });
    }

    // Rate driver
    if (body.action === "rate") {
      const stars = Math.min(5, Math.max(1, Number(body.stars) || 5));
      if (!ride.assignedDriverId) {
        return NextResponse.json({ success: false, error: "No driver assigned" }, { status: 400 });
      }
      const profile = await prisma.conciergeDriverProfile.findUnique({
        where: { id: ride.assignedDriverId },
      });
      if (!profile) {
        return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
      }
      const rating = await prisma.conciergeRating.upsert({
        where: {
          rideId_fromRole_fromId: {
            rideId: id,
            fromRole: "CONCIERGE",
            fromId: auth.id,
          },
        },
        create: {
          rideId: id,
          fromRole: "CONCIERGE",
          fromId: auth.id,
          toRole: "DRIVER",
          toId: profile.driverId,
          stars,
          note: body.note ? String(body.note) : null,
          conciergeId: auth.id,
        },
        update: {
          stars,
          note: body.note ? String(body.note) : null,
        },
      });
      return NextResponse.json({ success: true, rating });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[concierge ride PATCH]", e);
    return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 });
  }
}
