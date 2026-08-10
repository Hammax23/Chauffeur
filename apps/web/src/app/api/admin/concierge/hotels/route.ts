// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const hotels = await prisma.hotel.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { concierges: true, rideRequests: true } } },
  });

  return NextResponse.json({ success: true, hotels });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ success: false, error: "Hotel name is required" }, { status: 400 });
    }

    const hotel = await prisma.hotel.create({
      data: {
        name,
        address: String(body.address || "").trim(),
        city: String(body.city || "").trim(),
        phone: String(body.phone || "").trim(),
        email: String(body.email || "").trim(),
        commissionPercent: Number(body.commissionPercent) >= 0 ? Number(body.commissionPercent) : 10,
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json({ success: true, hotel });
  } catch (e) {
    console.error("[admin hotels POST]", e);
    return NextResponse.json({ success: false, error: "Failed to create hotel" }, { status: 500 });
  }
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
      return NextResponse.json({ success: false, error: "Hotel id required" }, { status: 400 });
    }

    const hotel = await prisma.hotel.update({
      where: { id },
      data: {
        ...(body.name != null ? { name: String(body.name).trim() } : {}),
        ...(body.address != null ? { address: String(body.address).trim() } : {}),
        ...(body.city != null ? { city: String(body.city).trim() } : {}),
        ...(body.phone != null ? { phone: String(body.phone).trim() } : {}),
        ...(body.email != null ? { email: String(body.email).trim() } : {}),
        ...(body.commissionPercent != null
          ? { commissionPercent: Number(body.commissionPercent) }
          : {}),
        ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
      },
    });

    return NextResponse.json({ success: true, hotel });
  } catch (e) {
    console.error("[admin hotels PUT]", e);
    return NextResponse.json({ success: false, error: "Failed to update hotel" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "Hotel id required" }, { status: 400 });
  }

  await prisma.hotel.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
