import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") || "SUBMITTED").toUpperCase();

    const apps = await prisma.driverApplication.findMany({
      where: { status },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        inviteId: true,
        status: true,
        rejectionReason: true,
        name: true,
        email: true,
        phone: true,
        vehicle: true,
        vehiclePlate: true,
        photo: true,
        submittedAt: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, applications: apps });
  } catch (error: any) {
    console.error("List driver applications error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch applications" }, { status: 500 });
  }
}

