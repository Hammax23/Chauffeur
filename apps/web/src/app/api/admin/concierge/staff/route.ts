import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const hotelId = new URL(request.url).searchParams.get("hotelId");
  const staff = await prisma.concierge.findMany({
    where: hotelId ? { hotelId } : undefined,
    orderBy: { name: "asc" },
    include: { hotel: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    success: true,
    staff: staff.map((s: any) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      isActive: s.isActive,
      hotelId: s.hotelId,
      hotelName: s.hotel.name,
      createdAt: s.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const hotelId = String(body.hotelId || "");

    if (!name || !email || !password || !hotelId) {
      return NextResponse.json(
        { success: false, error: "Name, email, password, and hotel are required" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(password, 10);
    const concierge = await prisma.concierge.create({
      data: {
        name,
        email,
        phone: String(body.phone || "").trim(),
        password: hash,
        hotelId,
        isActive: body.isActive !== false,
      },
      include: { hotel: { select: { name: true } } },
    });

    return NextResponse.json({
      success: true,
      staff: {
        id: concierge.id,
        name: concierge.name,
        email: concierge.email,
        phone: concierge.phone,
        isActive: concierge.isActive,
        hotelId: concierge.hotelId,
        hotelName: concierge.hotel.name,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg.includes("Unique")) {
      return NextResponse.json({ success: false, error: "Email already in use" }, { status: 400 });
    }
    console.error("[admin concierge staff POST]", e);
    return NextResponse.json({ success: false, error: "Failed to create concierge" }, { status: 500 });
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
      return NextResponse.json({ success: false, error: "Id required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.name != null) data.name = String(body.name).trim();
    if (body.email != null) data.email = String(body.email).trim().toLowerCase();
    if (body.phone != null) data.phone = String(body.phone).trim();
    if (body.hotelId != null) data.hotelId = String(body.hotelId);
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (body.password && String(body.password).length >= 4) {
      data.password = await bcrypt.hash(String(body.password), 10);
    }

    const concierge = await prisma.concierge.update({
      where: { id },
      data,
      include: { hotel: { select: { name: true } } },
    });

    return NextResponse.json({
      success: true,
      staff: {
        id: concierge.id,
        name: concierge.name,
        email: concierge.email,
        phone: concierge.phone,
        isActive: concierge.isActive,
        hotelId: concierge.hotelId,
        hotelName: concierge.hotel.name,
      },
    });
  } catch (e) {
    console.error("[admin concierge staff PUT]", e);
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "Id required" }, { status: 400 });
  }

  await prisma.concierge.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
