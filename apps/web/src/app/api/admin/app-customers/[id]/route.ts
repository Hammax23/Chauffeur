import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

type RouteContext = { params: Promise<{ id: string }> };

async function requireAdmin(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  return auth.authenticated;
}

/** Block / unblock an app-registered customer. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const action = String(body.action || "").toLowerCase();
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";

    if (!["block", "unblock"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "action must be block or unblock" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: { id, registrationSource: "app" },
    });
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data:
        action === "block"
          ? {
              accountStatus: "BLOCKED",
              blockedAt: new Date(),
              blockedReason: reason || "Blocked by administrator",
              pushToken: null,
            }
          : {
              accountStatus: "ACTIVE",
              blockedAt: null,
              blockedReason: null,
            },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        city: true,
        photo: true,
        oauthProvider: true,
        accountStatus: true,
        blockedAt: true,
        blockedReason: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: action === "block" ? "Customer blocked" : "Customer unblocked",
      customer: updated,
    });
  } catch (error) {
    console.error("[app-customers PATCH]", error);
    return NextResponse.json({ success: false, error: "Failed to update customer" }, { status: 500 });
  }
}

/** Permanently delete an app-registered customer (reservations are kept, link cleared). */
export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;

    const customer = await prisma.customer.findFirst({
      where: { id, registrationSource: "app" },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.reservation.updateMany({
        where: { customerId: id },
        data: { customerId: null },
      }),
      prisma.customer.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Customer deleted",
      deleted: customer,
    });
  } catch (error) {
    console.error("[app-customers DELETE]", error);
    return NextResponse.json({ success: false, error: "Failed to delete customer" }, { status: 500 });
  }
}
