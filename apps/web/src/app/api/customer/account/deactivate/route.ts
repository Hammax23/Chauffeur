import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  blockedCustomerResponse,
  getCustomerFromRequest,
  isCustomerBlocked,
  isCustomerDeactivated,
} from "@/lib/customer-auth";
import { TERMINAL_RESERVATION_STATUSES } from "@/lib/reservation-driver-assignment";

/**
 * POST /api/customer/account/deactivate
 * Soft-deactivates the authenticated customer (App Store–compliant self-service).
 */
export async function POST(req: NextRequest) {
  try {
    const payload = getCustomerFromRequest(req);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        accountStatus: true,
        deactivatedAt: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    if (isCustomerBlocked(customer)) {
      return NextResponse.json(blockedCustomerResponse(), { status: 403 });
    }

    if (isCustomerDeactivated(customer)) {
      return NextResponse.json(
        {
          success: true,
          message: "Account is already deactivated",
          alreadyDeactivated: true,
        },
        { status: 200 }
      );
    }

    const now = new Date();

    const [, cancelled] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customer.id },
        data: {
          accountStatus: "DEACTIVATED",
          deactivatedAt: now,
          pushToken: null,
        },
      }),
      // Cancel every non-finished ride (PENDING, ACCEPTED, ON THE WAY, ARRIVED, CIC, STOP, …)
      prisma.reservation.updateMany({
        where: {
          customerId: customer.id,
          status: { notIn: [...TERMINAL_RESERVATION_STATUSES] },
        },
        data: { status: "CANCELLED" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Account deactivated",
      cancelledReservations: cancelled.count,
      deactivatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("[customer/account/deactivate]", error);
    return NextResponse.json(
      { success: false, error: "Failed to deactivate account" },
      { status: 500 }
    );
  }
}
