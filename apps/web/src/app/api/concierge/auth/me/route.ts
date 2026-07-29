import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyConciergeToken } from "@/lib/concierge-auth";

export async function GET(req: NextRequest) {
  const auth = await verifyConciergeToken(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const concierge = await prisma.concierge.findUnique({
    where: { id: auth.id },
    include: { hotel: true },
  });

  if (!concierge || !concierge.isActive) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    concierge: {
      id: concierge.id,
      name: concierge.name,
      email: concierge.email,
      phone: concierge.phone,
      hotelId: concierge.hotelId,
      hotelName: concierge.hotel.name,
      hotelCommissionPercent: concierge.hotel.commissionPercent,
    },
  });
}
