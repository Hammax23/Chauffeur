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

// PUT - Update charge (by id, or upsert by chargeKey)
export async function PUT(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, chargeKey, chargeName, amount, isPercentage, isActive } = body as {
      id?: string;
      chargeKey?: string;
      chargeName?: string;
      amount?: number | string;
      isPercentage?: boolean;
      isActive?: boolean;
    };

    const parsedAmount = amount !== undefined ? parseFloat(String(amount)) : undefined;

    if (id) {
      const updateData: Record<string, unknown> = {};
      if (chargeName !== undefined) updateData.chargeName = chargeName;
      if (parsedAmount !== undefined) updateData.amount = parsedAmount;
      if (isPercentage !== undefined) updateData.isPercentage = isPercentage;
      if (isActive !== undefined) updateData.isActive = isActive;

      const charge = await prisma.reservationCharges.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json({ success: true, charge });
    }

    if (!chargeKey) {
      return NextResponse.json(
        { success: false, error: "Charge ID or chargeKey required" },
        { status: 400 }
      );
    }

    const charge = await prisma.reservationCharges.upsert({
      where: { chargeKey },
      create: {
        chargeKey,
        chargeName: chargeName || chargeKey,
        amount: parsedAmount ?? 0,
        isPercentage: isPercentage ?? false,
        isActive: isActive !== false,
      },
      update: {
        ...(chargeName !== undefined ? { chargeName } : {}),
        ...(parsedAmount !== undefined ? { amount: parsedAmount } : {}),
        ...(isPercentage !== undefined ? { isPercentage } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
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
