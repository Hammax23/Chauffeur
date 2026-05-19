import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";
import { sendTransactionalEmail } from "@/lib/email-delivery";
import { buildDriverApprovalEmailHtml } from "@/lib/driver-application-emails";

function generateDriverId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "DRV-";
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

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
    const password = typeof body?.password === "string" ? body.password.trim() : "";
    const status = typeof body?.status === "string" ? body.status : "available";
    const overrideReason = typeof body?.overrideReason === "string" ? body.overrideReason.trim().slice(0, 500) : "";
    const allowExpiredOverride = Boolean(body?.allowExpiredOverride);

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const app = await prisma.driverApplication.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!app) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }
    if (app.status !== "SUBMITTED") {
      return NextResponse.json({ success: false, error: "Application is not pending" }, { status: 409 });
    }

    const expiredDocs = (app.documents || []).filter((d) => d.status === "EXPIRED");
    if (expiredDocs.length > 0 && !(allowExpiredOverride && overrideReason)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "One or more documents are expired. Provide override reason to approve anyway.",
          expiredKeys: expiredDocs.map((d) => d.key),
        },
        { status: 400 }
      );
    }

    const existing = await prisma.driver.findUnique({ where: { email: app.email } });
    if (existing) {
      return NextResponse.json({ success: false, error: "A driver with this email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const created = await prisma.$transaction(async (tx) => {
      // Generate unique driverId
      let driverId = generateDriverId();
      let attempts = 0;
      while (attempts < 10) {
        const found = await tx.driver.findUnique({ where: { driverId } });
        if (!found) break;
        driverId = generateDriverId();
        attempts++;
      }

      const driver = await tx.driver.create({
        data: {
          driverId,
          name: app.name,
          phone: app.phone,
          email: app.email,
          vehicle: app.vehicle,
          vehiclePlate: app.vehiclePlate,
          password: hashedPassword,
          photo: app.photo,
          backgroundCheckUrl: app.backgroundCheckUrl,
          commercialInsuranceUrl: app.commercialInsuranceUrl,
          driverLicenceUrl: app.driverLicenceUrl,
          proofOfWorkEligibilityUrl: app.proofOfWorkEligibilityUrl,
          municipalTaxiLimoLicenceUrl: app.municipalTaxiLimoLicenceUrl,
          vehicleInsuranceUrl: app.vehicleInsuranceUrl,
          vehicleRegistrationUrl: app.vehicleRegistrationUrl,
          status,
          rating: 5.0,
          totalTrips: 0,
        },
      });

      await tx.driverApplication.update({
        where: { id: app.id },
        data: { status: "APPROVED", reviewedAt: new Date(), rejectionReason: null },
      });

      if (expiredDocs.length > 0 && allowExpiredOverride && overrideReason) {
        await tx.driverApplicationDocument.updateMany({
          where: {
            applicationId: app.id,
            status: "EXPIRED",
          },
          data: {
            overrideReason,
            status: "VALID",
            expirySource: "ADMIN",
          },
        });
      }

      return driver;
    });

    const approvalHtml = buildDriverApprovalEmailHtml({
      driverName: created.name,
      loginEmail: created.email,
      plainPassword: password,
      driverReferenceId: created.driverId,
    });

    await sendTransactionalEmail({
      to: created.email,
      subject: "Your SARJ driver application has been approved",
      html: approvalHtml,
      logLabel: "driver-approval",
    });

    return NextResponse.json({ success: true, driver: { id: created.id, driverId: created.driverId } });
  } catch (error: any) {
    console.error("Approve driver application error:", error);
    return NextResponse.json({ success: false, error: "Failed to approve application" }, { status: 500 });
  }
}

