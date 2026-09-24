import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { SUPPORT_TICKET_STATUS_SET } from "@/lib/support-ticket-types";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const statusRaw =
      typeof body?.status === "string" ? body.status.trim().toUpperCase() : "";
    const status = SUPPORT_TICKET_STATUS_SET.has(statusRaw) ? statusRaw : "";
    const adminNote =
      typeof body?.adminNote === "string"
        ? body.adminNote.replace(/\u0000/g, "").trim().slice(0, 2000) || null
        : undefined;

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Invalid status." },
        { status: 400 }
      );
    }

    const existing = await prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Ticket not found." },
        { status: 404 }
      );
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        status,
        ...(adminNote !== undefined ? { adminNote } : {}),
        resolvedAt:
          status === "RESOLVED" || status === "CLOSED" ? new Date() : null,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error("[admin/support-tickets PATCH]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update ticket" },
      { status: 500 }
    );
  }
}
