import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

function slugifyTierId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseVehicleBody(body: Record<string, unknown>) {
  return {
    tierId: typeof body.tierId === "string" ? slugifyTierId(body.tierId) : "",
    title: typeof body.title === "string" ? body.title.trim() : "",
    subtitle: typeof body.subtitle === "string" ? body.subtitle.trim() : "",
    description: typeof body.description === "string" ? body.description.trim() : "",
    image: typeof body.image === "string" ? body.image.trim() : "",
    group: body.group === "executive" ? "executive" : "standard",
    category: typeof body.category === "string" ? body.category.trim() : "Sedan",
    seating: typeof body.seating === "string" ? body.seating.trim() : "",
    luggage: typeof body.luggage === "string" ? body.luggage.trim() : "",
    pricePerKm: Number(body.pricePerKm) || 0,
    hourlyRate: Number(body.hourlyRate) || 0,
    showOnHome: body.showOnHome !== false,
    isActive: body.isActive !== false,
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
  };
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const vehicles = await prisma.appFleetVehicle.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
    return NextResponse.json({ success: true, vehicles });
  } catch (error) {
    console.error("[AppFleet GET]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch app fleet" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = parseVehicleBody(body);

    if (!data.tierId || !data.title) {
      return NextResponse.json(
        { success: false, error: "Tier ID and title are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.appFleetVehicle.findUnique({ where: { tierId: data.tierId } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Tier ID already exists" }, { status: 400 });
    }

    const vehicle = await prisma.appFleetVehicle.create({ data });
    return NextResponse.json({ success: true, vehicle });
  } catch (error) {
    console.error("[AppFleet POST]", error);
    return NextResponse.json({ success: false, error: "Failed to create vehicle" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ success: false, error: "Vehicle id required" }, { status: 400 });
    }

    const data = parseVehicleBody(body);
    if (!data.tierId || !data.title) {
      return NextResponse.json(
        { success: false, error: "Tier ID and title are required" },
        { status: 400 }
      );
    }

    const conflict = await prisma.appFleetVehicle.findFirst({
      where: { tierId: data.tierId, NOT: { id } },
      select: { id: true },
    });
    if (conflict) {
      return NextResponse.json({ success: false, error: "Tier ID already exists" }, { status: 400 });
    }

    const vehicle = await prisma.appFleetVehicle.update({
      where: { id },
      data,
    });
    return NextResponse.json({ success: true, vehicle });
  } catch (error) {
    console.error("[AppFleet PUT]", error);
    return NextResponse.json({ success: false, error: "Failed to update vehicle" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Vehicle id required" }, { status: 400 });
    }
    await prisma.appFleetVehicle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AppFleet DELETE]", error);
    return NextResponse.json({ success: false, error: "Failed to delete vehicle" }, { status: 500 });
  }
}
