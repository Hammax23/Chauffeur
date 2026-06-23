import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

// GET - List all charges
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const charges = await prisma.reservationCharges.findMany({
      orderBy: { chargeKey: "asc" },
    });

    return NextResponse.json({ success: true, charges });
  } catch (error: any) {
    console.error("[Charges GET] Error:", error?.message);
    return NextResponse.json({ success: false, error: "Failed to fetch charges" }, { status: 500 });
  }
}

// POST - Create new charge
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { chargeKey, chargeName, amount, isPercentage = false, isActive = true } = body;

    if (!chargeKey || !chargeName) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.reservationCharges.findUnique({ where: { chargeKey } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Charge key already exists" }, { status: 400 });
    }

    const charge = await prisma.reservationCharges.create({
      data: {
        chargeKey,
        chargeName,
        amount: parseFloat(amount) || 0,
        isPercentage,
        isActive,
      },
    });

    return NextResponse.json({ success: true, charge });
  } catch (error: any) {
    console.error("[Charges POST] Error:", error?.message);
    return NextResponse.json({ success: false, error: "Failed to create charge" }, { status: 500 });
  }
}

// PUT - Update charge
export async function PUT(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Charge ID required" }, { status: 400 });
    }

    if (updateData.amount !== undefined) {
      updateData.amount = parseFloat(updateData.amount);
    }

    const charge = await prisma.reservationCharges.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, charge });
  } catch (error: any) {
    console.error("[Charges PUT] Error:", error?.message);
    return NextResponse.json({ success: false, error: "Failed to update charge" }, { status: 500 });
  }
}

// DELETE - Delete charge
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Charge ID required" }, { status: 400 });
    }

    await prisma.reservationCharges.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Charges DELETE] Error:", error?.message);
    return NextResponse.json({ success: false, error: "Failed to delete charge" }, { status: 500 });
  }
}
