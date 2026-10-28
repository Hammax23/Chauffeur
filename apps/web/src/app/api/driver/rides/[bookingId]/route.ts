import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { publishReservationFromDb } from "@/lib/realtime-bus";
import { claimLiveOffer, declineLiveOffer } from "@/lib/live-auto";
import { sanitizeSpecialRequirementsForDriver } from "@/lib/driver-visible-notes";
import {
  geocodeAddress,
  isValidLatLng,
} from "@/lib/geocode-address";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

type StopPeriod = { start: string; end?: string };

function parseStopPeriods(json: string | null | undefined): StopPeriod[] {
  if (!json) return [];
  try {
    const p = JSON.parse(json) as unknown;
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function getDriverFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; type: string };
    if (decoded.type !== "driver") return null;
    return decoded;
  } catch {
    return null;
  }
}

async function findRideForDriver(bookingId: string, driverId: string) {
  const assigned = await prisma.reservation.findFirst({
    where: { bookingId, assignedDriverId: driverId },
  });
  if (assigned) return assigned;

  const openOffer = await prisma.rideOffer.findFirst({
    where: { bookingId, driverId, status: "OPEN" },
  });
  if (!openOffer) return null;

  return prisma.reservation.findFirst({
    where: { bookingId, status: "PENDING", assignedDriverId: null },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;
    const reservation = await findRideForDriver(bookingId, tokenData.id);

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    const liveOffer =
      !reservation.assignedDriverId &&
      !!(await prisma.rideOffer.findFirst({
        where: { bookingId, driverId: tokenData.id, status: "OPEN" },
      }));

    const tripReview =
      reservation.assignedDriverId === tokenData.id
        ? await prisma.tripReview.findUnique({
            where: { reservationId: reservation.id },
            select: {
              stars: true,
              comment: true,
              createdAt: true,
              customer: { select: { firstName: true, lastName: true } },
            },
          })
        : null;

    let pickupLat =
      typeof reservation.pickupLat === "number" ? reservation.pickupLat : null;
    let pickupLng =
      typeof reservation.pickupLng === "number" ? reservation.pickupLng : null;
    let dropoffLat =
      typeof reservation.dropoffLat === "number" ? reservation.dropoffLat : null;
    let dropoffLng =
      typeof reservation.dropoffLng === "number" ? reservation.dropoffLng : null;

    // One-shot geocode + backfill (parallel) when booking has address but no pin.
    const needPickupGeo =
      !isValidLatLng(pickupLat, pickupLng) && !!reservation.pickupLocation?.trim();
    const needDropoffGeo =
      !isValidLatLng(dropoffLat, dropoffLng) &&
      !!reservation.dropoffLocation?.trim() &&
      !/^as directed$/i.test(reservation.dropoffLocation.trim());

    if (needPickupGeo || needDropoffGeo) {
      const [pickupGeo, dropoffGeo] = await Promise.all([
        needPickupGeo
          ? geocodeAddress(reservation.pickupLocation)
          : Promise.resolve(null),
        needDropoffGeo
          ? geocodeAddress(reservation.dropoffLocation)
          : Promise.resolve(null),
      ]);

      if (pickupGeo) {
        pickupLat = pickupGeo.lat;
        pickupLng = pickupGeo.lng;
        try {
          await prisma.reservation.updateMany({
            where: { id: reservation.id, pickupLat: null, pickupLng: null },
            data: { pickupLat: pickupGeo.lat, pickupLng: pickupGeo.lng },
          });
        } catch (err) {
          console.warn("[driver-ride] pickup coords backfill failed", err);
        }
      }

      if (dropoffGeo) {
        dropoffLat = dropoffGeo.lat;
        dropoffLng = dropoffGeo.lng;
        try {
          await prisma.reservation.updateMany({
            where: { id: reservation.id, dropoffLat: null, dropoffLng: null },
            data: { dropoffLat: dropoffGeo.lat, dropoffLng: dropoffGeo.lng },
          });
        } catch (err) {
          console.warn("[driver-ride] dropoff coords backfill failed", err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      ride: {
        id: reservation.id,
        bookingId: reservation.bookingId,
        status: reservation.status,
        customerName: `${reservation.firstName} ${reservation.lastName}`,
        phone: reservation.phone,
        email: reservation.email,
        serviceType: reservation.serviceType,
        vehicle: reservation.vehicle,
        passengers: reservation.passengers,
        childSeats: reservation.childSeats,
        serviceDate: reservation.serviceDate,
        serviceTime: reservation.serviceTime,
        pickupLocation: reservation.pickupLocation,
        pickupLat,
        pickupLng,
        stops: reservation.stops || "",
        dropoffLocation: reservation.dropoffLocation,
        dropoffLat,
        dropoffLng,
        distance: reservation.distance || "",
        duration: reservation.duration || "",
        total: reservation.total,
        specialRequirements: sanitizeSpecialRequirementsForDriver(
          reservation.specialRequirements
        ),
        createdAt: reservation.createdAt.toISOString(),
        driverOnTheWayAt: reservation.driverOnTheWayAt?.toISOString() ?? null,
        driverStopPeriodsJson: reservation.driverStopPeriodsJson ?? null,
        completedAt: reservation.completedAt?.toISOString() ?? null,
        liveOffer,
        review: tripReview
          ? {
              stars: tripReview.stars,
              comment: tripReview.comment,
              createdAt: tripReview.createdAt.toISOString(),
              customerName:
                [tripReview.customer.firstName, tripReview.customer.lastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim() || "Customer",
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Driver ride detail error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch ride" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;
    const body = await req.json();
    const { status, action } = body;

    // Reject / decline (preferred over DELETE — some networks block DELETE)
    if (action === "reject" || status === "REJECTED") {
      const result = await declineLiveOffer(bookingId, tokenData.id);
      if (!result.ok) {
        return NextResponse.json(
          { success: false, error: "Ride not found or already unavailable" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, message: "Ride rejected" });
    }

    const validStatuses = ["ACCEPTED", "ON THE WAY", "ARRIVED", "CIC", "STOP", "DONE"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    if (status === "ACCEPTED") {
      const claim = await claimLiveOffer(bookingId, tokenData.id);
      if (!claim.ok) {
        if (claim.reason === "taken") {
          return NextResponse.json(
            { success: false, error: "This ride was just accepted by another driver." },
            { status: 409 }
          );
        }
        if (claim.reason === "busy") {
          return NextResponse.json(
            { success: false, error: "You already have an active ride." },
            { status: 409 }
          );
        }
        return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: "Status updated to ACCEPTED" });
    }

    const reservation = await prisma.reservation.findFirst({
      where: { bookingId, assignedDriverId: tokenData.id },
    });

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {
      status,
      statusUpdatedAt: now,
      driverResponse: "ACCEPTED",
      driverRespondedAt: now,
    };

    const periods = parseStopPeriods(reservation.driverStopPeriodsJson);
    const firstOnTheWay = status === "ON THE WAY" && !reservation.driverOnTheWayAt;

    if (firstOnTheWay) {
      updateData.driverOnTheWayAt = now;
    }

    if (status === "ARRIVED" && !reservation.driverArrivedAt) {
      updateData.driverArrivedAt = now;
    }

    if (status === "STOP") {
      if (reservation.status !== "CIC") {
        return NextResponse.json(
          { success: false, error: "Stop is only available after Customer In Car" },
          { status: 400 }
        );
      }
      const open = periods.find((x) => !x.end);
      if (open) {
        return NextResponse.json(
          { success: false, error: "Already at a stop — tap Continue first" },
          { status: 400 }
        );
      }
      periods.push({ start: now.toISOString() });
      updateData.driverStopPeriodsJson = JSON.stringify(periods);
    }

    if (status === "CIC" && reservation.status === "STOP") {
      const last = periods[periods.length - 1];
      if (!last || last.end) {
        return NextResponse.json(
          { success: false, error: "No active stop to continue from" },
          { status: 400 }
        );
      }
      last.end = now.toISOString();
      updateData.driverStopPeriodsJson = JSON.stringify(periods);
    }

    if (status === "DONE") {
      const doneAt = now;
      updateData.completedAt = doneAt;
      const last = periods[periods.length - 1];
      if (last && !last.end) {
        last.end = doneAt.toISOString();
        updateData.driverStopPeriodsJson = JSON.stringify(periods);
      }
      await prisma.driver.update({
        where: { id: tokenData.id },
        data: { totalTrips: { increment: 1 } },
      });
    }

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: updateData,
    });

    // Bill pickup wait + Meet & Greet extra wait when customer enters car (or trip completes)
    if (status === "CIC" || status === "DONE") {
      try {
        const { billPickupWaitIfNeeded, billMgWaitIfNeeded } = await import(
          "@/lib/fare-adjustments"
        );
        const fresh = await prisma.reservation.findUnique({ where: { id: reservation.id } });
        if (fresh) {
          await billPickupWaitIfNeeded({
            id: fresh.id,
            bookingId: fresh.bookingId,
            customerId: fresh.customerId,
            stripeCustomerId: fresh.stripeCustomerId,
            stripePaymentMethodId: fresh.stripePaymentMethodId,
            driverArrivedAt: fresh.driverArrivedAt,
            waitMinutesBilled: fresh.waitMinutesBilled,
            status: fresh.status,
          });
          await billMgWaitIfNeeded({
            id: fresh.id,
            bookingId: fresh.bookingId,
            customerId: fresh.customerId,
            stripeCustomerId: fresh.stripeCustomerId,
            stripePaymentMethodId: fresh.stripePaymentMethodId,
            specialRequirements: fresh.specialRequirements,
            serviceDate: fresh.serviceDate,
            serviceTime: fresh.serviceTime,
            actualLandingAt: fresh.actualLandingAt,
            mgWaitMinutesBilled: fresh.mgWaitMinutesBilled,
          });
        }
      } catch (waitErr) {
        console.error("[wait-charge] failed", waitErr);
      }
    }

    if (status === "DONE") {
      try {
        const { maybeQualifyReferralOnTripDone } = await import("@/lib/referrals");
        await maybeQualifyReferralOnTripDone({
          reservationId: reservation.id,
          bookingId: reservation.bookingId,
          customerId: reservation.customerId,
          paymentStatus: reservation.paymentStatus,
        });
      } catch (refErr) {
        console.error("[referral] qualify on DONE failed", refErr);
      }
      try {
        const { softHideThreadForParticipants } = await import("@/lib/trip-chat");
        await softHideThreadForParticipants(bookingId);
      } catch (chatErr) {
        console.error("[chat] soft-hide on DONE failed", chatErr);
      }
    }

    await publishReservationFromDb(bookingId, "status_changed");

    // First On the Way — tell customer live location is unlocked (works if app is closed).
    if (firstOnTheWay) {
      void import("@/lib/customer-push")
        .then(({ notifyCustomerDriverOnTheWay }) =>
          notifyCustomerDriverOnTheWay(bookingId)
        )
        .catch((err) => console.error("[on-the-way] customer push", err));
    }

    return NextResponse.json({ success: true, message: `Status updated to ${status}` });
  } catch (error) {
    console.error("Update ride status error:", error);
    return NextResponse.json({ success: false, error: "Failed to update status" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;
    const result = await declineLiveOffer(bookingId, tokenData.id);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Ride rejected" });
  } catch (error) {
    console.error("Reject ride error:", error);
    return NextResponse.json({ success: false, error: "Failed to reject ride" }, { status: 500 });
  }
}
