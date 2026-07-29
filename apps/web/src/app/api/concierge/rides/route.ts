import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyConciergeToken } from "@/lib/concierge-auth";
import {
  VEHICLE_REQUEST_RULES,
  computeHotelCommission,
  computePlatformFee,
  makeRequestCode,
  type VehicleRequestRule,
} from "@/lib/concierge-rules";

export async function GET(req: NextRequest) {
  const auth = await verifyConciergeToken(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const status = new URL(req.url).searchParams.get("status");
  const rides = await prisma.conciergeRideRequest.findMany({
    where: {
      conciergeId: auth.id,
      ...(status === "active"
        ? { status: { in: ["OPEN", "ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_TRIP"] } }
        : status === "completed"
          ? { status: "COMPLETED" }
          : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      hotel: { select: { name: true, commissionPercent: true } },
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
            },
          },
        },
      },
      commission: true,
      ratings: true,
    },
  });

  return NextResponse.json({ success: true, rides });
}

export async function POST(req: NextRequest) {
  const auth = await verifyConciergeToken(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const pickupLocation = String(body.pickupLocation || "").trim();
    const vehicleRequestRule = String(body.vehicleRequestRule || "") as VehicleRequestRule;
    const fare = Math.max(0, Number(body.fare) || 0);

    if (!pickupLocation) {
      return NextResponse.json({ success: false, error: "Pickup location required" }, { status: 400 });
    }
    if (!VEHICLE_REQUEST_RULES.some((r) => r.value === vehicleRequestRule)) {
      return NextResponse.json({ success: false, error: "Invalid vehicle request rule" }, { status: 400 });
    }

    const concierge = await prisma.concierge.findUnique({
      where: { id: auth.id },
      include: { hotel: true },
    });
    if (!concierge?.isActive) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const paymentPref = ["CASH", "APP"].includes(body.guestPaymentMethod)
      ? String(body.guestPaymentMethod)
      : "UNSET";

    const hotelCommission = computeHotelCommission(fare, concierge.hotel.commissionPercent);

    const ride = await prisma.conciergeRideRequest.create({
      data: {
        requestCode: makeRequestCode(),
        hotelId: concierge.hotelId,
        conciergeId: concierge.id,
        guestName: String(body.guestName || "").trim(),
        guestPhone: String(body.guestPhone || "").trim(),
        pickupLocation,
        dropoffLocation: String(body.dropoffLocation || "").trim(),
        notes: body.notes ? String(body.notes) : null,
        vehicleRequestRule,
        guestPaymentMethod: paymentPref,
        fare,
        platformFee: computePlatformFee(fare, paymentPref),
        hotelCommission,
        status: "OPEN",
        commission: { create: {} },
      },
      include: {
        hotel: { select: { name: true } },
        commission: true,
      },
    });

    void import("@/lib/concierge-push")
      .then(({ notifyConciergeOffer }) => notifyConciergeOffer(ride.id))
      .catch((err) => console.error("[concierge rides] push fan-out", err));

    return NextResponse.json({ success: true, ride });
  } catch (e) {
    console.error("[concierge rides POST]", e);
    return NextResponse.json({ success: false, error: "Failed to create request" }, { status: 500 });
  }
}
