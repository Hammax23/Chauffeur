import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { markReservationNoShow } from "@/lib/fare-adjustments";
import { MG_FREE_WAIT_MINUTES } from "@/lib/mg-policy";
import { publishReservationFromDb } from "@/lib/realtime-bus";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

function getDriverFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      type: string;
    };
    if (decoded.type !== "driver") return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Assigned driver may mark no-show only after ARRIVED + free-wait window.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;
    const body = await req.json().catch(() => ({}));
    const notes = typeof body?.notes === "string" ? body.notes : "";

    const reservation = await prisma.reservation.findFirst({
      where: { bookingId, assignedDriverId: tokenData.id },
    });
    if (!reservation) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    if (reservation.status !== "ARRIVED") {
      return NextResponse.json(
        { success: false, error: "No-show is only available after you mark Arrived" },
        { status: 400 }
      );
    }

    if (!reservation.driverArrivedAt) {
      return NextResponse.json(
        { success: false, error: "Arrival time missing — mark Arrived again" },
        { status: 400 }
      );
    }

    const waitedMs = Date.now() - reservation.driverArrivedAt.getTime();
    const waitedMin = Math.floor(waitedMs / 60_000);
    if (waitedMin < MG_FREE_WAIT_MINUTES) {
      const left = MG_FREE_WAIT_MINUTES - waitedMin;
      return NextResponse.json(
        {
          success: false,
          error: `Free wait still active — you can mark no-show in ${left} min`,
          freeWaitMinutes: MG_FREE_WAIT_MINUTES,
          waitedMinutes: waitedMin,
        },
        { status: 400 }
      );
    }

    const result = await markReservationNoShow({
      bookingId,
      markedBy: `driver:${tokenData.id}`,
      notes: notes || "Driver marked no-show after free wait",
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error || "Could not mark no-show" },
        { status: 400 }
      );
    }

    try {
      await publishReservationFromDb(bookingId);
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      success: true,
      bookingId,
      status: result.status || "NO_SHOW",
    });
  } catch (error) {
    console.error("Driver no-show error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
