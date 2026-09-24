import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getActiveCustomerFromRequest,
  customerAuthFailurePayload,
} from "@/lib/customer-auth";

const HISTORY_STATUSES = new Set(["DONE", "CANCELLED", "CANCELED"]);

/**
 * Soft-remove a past trip from the customer's History list.
 * Does NOT delete the reservation (admin / billing / disputes keep the record).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }
    const tokenData = auth.customer;
    const { id } = await params;

    const reservation = await prisma.reservation.findFirst({
      where: {
        customerId: tokenData.id,
        OR: [{ bookingId: id }, { id }],
      },
      select: {
        id: true,
        bookingId: true,
        status: true,
        customerHistoryHiddenAt: true,
      },
    });

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }

    if (!HISTORY_STATUSES.has(reservation.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Only completed or cancelled trips can be removed from History.",
          code: "NOT_HISTORY_STATUS",
        },
        { status: 400 }
      );
    }

    if (reservation.customerHistoryHiddenAt) {
      return NextResponse.json({
        success: true,
        alreadyHidden: true,
        bookingId: reservation.bookingId,
        message: "Already removed from History.",
      });
    }

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { customerHistoryHiddenAt: new Date() },
      select: { bookingId: true, customerHistoryHiddenAt: true },
    });

    return NextResponse.json({
      success: true,
      bookingId: updated.bookingId,
      hiddenAt: updated.customerHistoryHiddenAt?.toISOString() ?? null,
      message:
        "Removed from your History. This does not delete the trip from our records.",
    });
  } catch (error) {
    console.error("[hide-from-history]", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove from History" },
      { status: 500 }
    );
  }
}
