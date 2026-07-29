import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const filter = new URL(request.url).searchParams.get("filter") || "disputes";

  const commissions = await prisma.commissionConfirmation.findMany({
    where:
      filter === "disputes"
        ? { disputeOpen: true }
        : filter === "pending"
          ? {
              OR: [{ driverClaim: "UNSET" }, { conciergeClaim: "UNSET" }],
            }
          : undefined,
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      ride: {
        include: {
          hotel: { select: { name: true } },
          concierge: { select: { name: true } },
          assignedDriverProfile: {
            include: { driver: { select: { name: true } } },
          },
        },
      },
    },
  });

  return NextResponse.json({ success: true, commissions });
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ success: false, error: "Id required" }, { status: 400 });
    }

    const commission = await prisma.commissionConfirmation.update({
      where: { id },
      data: {
        disputeOpen: false,
        matched: true,
        resolvedAt: new Date(),
        resolvedNote: body.resolvedNote ? String(body.resolvedNote) : "Resolved by admin",
        ...(body.driverClaim ? { driverClaim: String(body.driverClaim) } : {}),
        ...(body.conciergeClaim ? { conciergeClaim: String(body.conciergeClaim) } : {}),
      },
    });

    return NextResponse.json({ success: true, commission });
  } catch (e) {
    console.error("[admin commissions PUT]", e);
    return NextResponse.json({ success: false, error: "Failed to resolve" }, { status: 500 });
  }
}
