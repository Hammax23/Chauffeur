import { NextRequest, NextResponse } from "next/server";
import { getReservationById, updateReservationStatus } from "@/lib/data-store";
import { isDriverVisibleToCustomer } from "@/lib/customer-visible-driver";
import {
  verifyBookingLinkToken,
  type BookingLinkPurpose,
} from "@/lib/booking-link-token";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function isLinkExpired(completedAt: Date | null): boolean {
  if (!completedAt) return false;
  const expiryTime = new Date(completedAt.getTime() + 5 * 60 * 1000);
  return new Date() > expiryTime;
}

function extractLinkKey(req: NextRequest, bodyKey?: unknown): string | null {
  const fromQuery = req.nextUrl.searchParams.get("k");
  if (fromQuery?.trim()) return fromQuery.trim();
  if (typeof bodyKey === "string" && bodyKey.trim()) return bodyKey.trim();
  return null;
}

function requireLink(
  bookingId: string,
  purpose: BookingLinkPurpose,
  key: string | null
): NextResponse | null {
  if (!verifyBookingLinkToken(bookingId, purpose, key)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid or missing link key. Open the secure link from your SARJ email or SMS.",
        code: "INVALID_LINK_KEY",
      },
      { status: 401 }
    );
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`driver-status-get:${ip}`, {
      maxRequests: 120,
      windowMs: 60_000,
    });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 }
      );
    }

    const bookingId = request.nextUrl.searchParams.get("bookingId")?.trim() || "";
    const purposeRaw = (request.nextUrl.searchParams.get("purpose") || "").trim();
    const purpose: BookingLinkPurpose =
      purposeRaw === "track" ? "track" : "driver";

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "Missing bookingId" },
        { status: 400 }
      );
    }

    const denied = requireLink(bookingId, purpose, extractLinkKey(request));
    if (denied) return denied;

    const reservation = await getReservationById(bookingId);

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    if (isLinkExpired(reservation.completedAt)) {
      return NextResponse.json(
        { success: false, expired: true, error: "This link has expired" },
        { status: 410 }
      );
    }

    const showDriver =
      !!reservation.assignedDriver &&
      isDriverVisibleToCustomer({
        status: reservation.status,
        driverResponse: reservation.driverResponse,
      });

    // Track links get less PII than driver operational links.
    const isTrack = purpose === "track";
    const driverInfo = showDriver
      ? {
          chauffeurName: reservation.assignedDriver!.name,
          chauffeurPhone: isTrack ? null : reservation.assignedDriver!.phone,
          chauffeurVehicle: reservation.assignedDriver!.vehicle,
          chauffeurPlate: reservation.assignedDriver!.vehiclePlate,
          chauffeurPhoto: reservation.assignedDriver!.photo,
        }
      : null;

    const statusUpdatedAt = reservation.statusUpdatedAt;
    let canEditStatus = purpose === "driver";
    let editTimeRemaining = 0;

    if (statusUpdatedAt && purpose === "driver") {
      const fiveMinutesMs = 5 * 60 * 1000;
      const timeSinceUpdate = Date.now() - new Date(statusUpdatedAt).getTime();
      canEditStatus = timeSinceUpdate < fiveMinutesMs;
      editTimeRemaining = Math.max(
        0,
        Math.ceil((fiveMinutesMs - timeSinceUpdate) / 1000)
      );
    }

    return NextResponse.json({
      success: true,
      status: reservation.status,
      firstName: reservation.firstName,
      lastName: isTrack ? undefined : reservation.lastName,
      phone: isTrack ? undefined : reservation.phone,
      vehicle: reservation.vehicle,
      serviceDate: reservation.serviceDate,
      serviceTime: reservation.serviceTime,
      pickupLocation: reservation.pickupLocation,
      stops: reservation.stops,
      dropoffLocation: reservation.dropoffLocation,
      statusUpdatedAt: statusUpdatedAt?.toISOString() || null,
      canEditStatus,
      editTimeRemaining,
      ...driverInfo,
    });
  } catch (error: unknown) {
    console.error("Driver status GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`driver-status-post:${ip}`, {
      maxRequests: 30,
      windowMs: 60_000,
    });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const bookingId = typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
    const status = typeof body?.status === "string" ? body.status : "";
    const key = extractLinkKey(request, body?.k);

    if (!bookingId || !status) {
      return NextResponse.json(
        { success: false, error: "Missing bookingId or status" },
        { status: 400 }
      );
    }

    // Status mutations require the driver-purpose link key (not track).
    const denied = requireLink(bookingId, "driver", key);
    if (denied) return denied;

    const validStatuses = ["PENDING", "ON THE WAY", "ARRIVED", "CIC", "DONE"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const prev = await getReservationById(bookingId);
    if (!prev) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    const success = await updateReservationStatus(bookingId, status);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    if (status === "DONE") {
      try {
        const { softHideThreadForParticipants } = await import("@/lib/trip-chat");
        await softHideThreadForParticipants(bookingId);
      } catch (chatErr) {
        console.error("[chat] soft-hide on driver-status DONE failed", chatErr);
      }
    }

    const { fireCustomerLifecyclePush } = await import("@/lib/customer-push");
    fireCustomerLifecyclePush(bookingId, status, {
      status: prev.status,
      driverOnTheWayAt: prev.driverOnTheWayAt ?? null,
      driverArrivedAt: prev.driverArrivedAt ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Driver status POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update status" },
      { status: 500 }
    );
  }
}
