import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { sendTransactionalEmail } from "@/lib/email-delivery";
import { buildDriverRejectionEmailHtml } from "@/lib/driver-application-emails";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : null;

    const app = await prisma.driverApplication.findUnique({ where: { id } });
    if (!app) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }
    if (app.status !== "SUBMITTED") {
      return NextResponse.json({ success: false, error: "Application is not pending" }, { status: 409 });
    }

    await prisma.driverApplication.update({
      where: { id },
      data: { status: "REJECTED", reviewedAt: new Date(), rejectionReason: reason },
    });

    const rejectionHtml = buildDriverRejectionEmailHtml({
      applicantName: app.name,
      reason,
    });

    await sendTransactionalEmail({
      to: app.email,
      subject: "Update on your SARJ driver application",
      html: rejectionHtml,
      logLabel: "driver-rejection",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reject driver application error:", error);
    return NextResponse.json({ success: false, error: "Failed to reject application" }, { status: 500 });
  }
}

