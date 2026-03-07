import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const quotes = await prisma.quote.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json({
      success: true,
      quotes: quotes.map((q: typeof quotes[number]) => ({
        ...q,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("Get quotes error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch quotes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { passengerName, passengers, phone, email, serviceType, vehicle, pickupTime, pickupLocation, stops, dropoffLocation, additionalNotes } = body;

    if (!passengerName || !email || !serviceType || !vehicle || !pickupLocation) {
      return NextResponse.json({ success: false, error: "Required fields missing" }, { status: 400 });
    }

    const quoteId = `QT-${Date.now().toString(36).toUpperCase()}`;

    const quote = await prisma.quote.create({
      data: {
        quoteId,
        passengerName,
        passengers: passengers || "1",
        phone: phone || "",
        email,
        serviceType,
        vehicle,
        pickupTime: pickupTime || "",
        pickupLocation,
        stops: stops || null,
        dropoffLocation: dropoffLocation || "",
        additionalNotes: additionalNotes || null,
        status: "NEW",
      },
    });

    return NextResponse.json({ success: true, quote });
  } catch (error: any) {
    console.error("Create quote error:", error);
    return NextResponse.json({ success: false, error: "Failed to create quote" }, { status: 500 });
  }
}
