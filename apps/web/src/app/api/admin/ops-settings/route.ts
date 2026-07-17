import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  getLiveAutoDashboard,
  getOpsSettings,
  updateOpsSettings,
  broadcastLiveOffers,
  maybeBroadcastNewReservation,
} from "@/lib/live-auto";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dashboard = await getLiveAutoDashboard();
    return NextResponse.json({ success: true, ...dashboard });
  } catch (error) {
    console.error("[ops-settings GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const patch: { liveAutoMode?: boolean; onlyActiveDrivers?: boolean } = {};
    if (typeof body.liveAutoMode === "boolean") patch.liveAutoMode = body.liveAutoMode;
    if (typeof body.onlyActiveDrivers === "boolean") patch.onlyActiveDrivers = body.onlyActiveDrivers;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ success: false, error: "No changes provided" }, { status: 400 });
    }

    const wasOff = !(await getOpsSettings()).liveAutoMode;
    const settings = await updateOpsSettings(patch);

    // When turning ON: broadcast all currently unassigned PENDING rides
    let broadcastTotal = 0;
    if (wasOff && settings.liveAutoMode) {
      const pending = await prisma.reservation.findMany({
        where: { status: "PENDING", assignedDriverId: null },
        select: { bookingId: true },
        take: 100,
      });
      for (const row of pending) {
        const r = await broadcastLiveOffers(row.bookingId);
        broadcastTotal += r.offered;
      }
    }

    return NextResponse.json({
      success: true,
      settings,
      broadcastTotal,
    });
  } catch (error) {
    console.error("[ops-settings PATCH]", error);
    return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 });
  }
}

/** Manual re-broadcast for one booking (admin). */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    if (!bookingId) {
      // Broadcast all unassigned pending
      const settings = await getOpsSettings();
      if (!settings.liveAutoMode) {
        return NextResponse.json(
          { success: false, error: "Enable Live Auto Mode first" },
          { status: 400 }
        );
      }
      const pending = await prisma.reservation.findMany({
        where: { status: "PENDING", assignedDriverId: null },
        select: { bookingId: true },
        take: 100,
      });
      let offered = 0;
      for (const row of pending) {
        const r = await broadcastLiveOffers(row.bookingId);
        offered += r.offered;
      }
      return NextResponse.json({ success: true, offered, bookings: pending.length });
    }

    await maybeBroadcastNewReservation(bookingId);
    const r = await broadcastLiveOffers(bookingId);
    return NextResponse.json({ success: true, ...r });
  } catch (error) {
    console.error("[ops-settings POST]", error);
    return NextResponse.json({ success: false, error: "Broadcast failed" }, { status: 500 });
  }
}
