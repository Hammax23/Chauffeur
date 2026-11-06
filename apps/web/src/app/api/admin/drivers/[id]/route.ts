import { NextRequest, NextResponse } from "next/server";
import { updateDriver, deleteDriver, getDriverById } from "@/lib/data-store";
import { verifyAdminAuth } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const driver = await getDriverById(id);
    
    if (!driver) {
      return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, driver });
  } catch (error: any) {
    console.error("Get driver error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch driver" }, { status: 500 });
  }
}

export async function PUT(
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

    const normalizeUrlField = (v: unknown): string | null | undefined => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t.length ? t : null;
    };

    for (const key of [
      "photo",
      "backgroundCheckUrl",
      "commercialInsuranceUrl",
      "driverLicenceUrl",
      "proofOfWorkEligibilityUrl",
      "municipalTaxiLimoLicenceUrl",
      "vehicleInsuranceUrl",
      "vehicleRegistrationUrl",
    ] as const) {
      if (key in body) {
        body[key] = normalizeUrlField(body[key]);
      }
    }

    // If password is provided, hash it before updating
    if (body.password && body.password.trim() !== "") {
      body.password = await bcrypt.hash(body.password, 12);
    } else {
      // Remove empty password field to prevent overwriting with empty string
      delete body.password;
    }

    const success = await updateDriver(id, body);
    
    if (!success) {
      return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
    }

    // Deactivate → stop pushes to that driver's devices.
    if (body.isActive === false) {
      try {
        const { deleteAllPushDevicesForUser } = await import("@/lib/push-devices");
        await deleteAllPushDevicesForUser("DRIVER", id);
      } catch (pushErr) {
        console.error("[push] wipe devices on driver deactivate failed", pushErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update driver error:", error);
    return NextResponse.json({ success: false, error: "Failed to update driver" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Driver pay guard: never hard-delete a driver with any pay history (FKs are Restrict).
    // Admin should soft-deactivate (isActive=false) instead.
    const [earningCount, remittanceCount, payoutCount, adjustmentCount] = await Promise.all([
      prisma.driverEarning.count({ where: { driverId: id } }),
      prisma.driverRemittance.count({ where: { driverId: id } }),
      prisma.driverPayout.count({ where: { driverId: id } }),
      prisma.driverAdjustment.count({ where: { driverId: id } }),
    ]);

    if (earningCount + remittanceCount + payoutCount + adjustmentCount > 0) {
      return NextResponse.json(
        {
          success: false,
          code: "DRIVER_HAS_PAY_HISTORY",
          error:
            "This driver has pay history. Deactivate (isActive=false) instead of deleting so earnings, remittances, and payouts stay intact for audit.",
          counts: {
            earnings: earningCount,
            remittances: remittanceCount,
            payouts: payoutCount,
            adjustments: adjustmentCount,
          },
        },
        { status: 409 }
      );
    }

    try {
      const { deleteAllPushDevicesForUser } = await import("@/lib/push-devices");
      await deleteAllPushDevicesForUser("DRIVER", id);
    } catch (pushErr) {
      console.error("[push] wipe devices on driver delete failed", pushErr);
    }
    const success = await deleteDriver(id);
    
    if (!success) {
      return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete driver error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete driver" }, { status: 500 });
  }
}
