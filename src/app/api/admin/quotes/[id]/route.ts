import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quote = await prisma.quote.findUnique({ where: { id } });
    
    if (!quote) {
      return NextResponse.json({ success: false, error: "Quote not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, quote });
  } catch (error: any) {
    console.error("Get quote error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch quote" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        status: body.status,
        passengerName: body.passengerName,
        passengers: body.passengers,
        phone: body.phone,
        email: body.email,
        serviceType: body.serviceType,
        vehicle: body.vehicle,
        pickupTime: body.pickupTime,
        pickupLocation: body.pickupLocation,
        stops: body.stops,
        dropoffLocation: body.dropoffLocation,
        additionalNotes: body.additionalNotes,
      },
    });

    return NextResponse.json({ success: true, quote });
  } catch (error: any) {
    console.error("Update quote error:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ success: false, error: "Quote not found" }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: "Failed to update quote" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.quote.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete quote error:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ success: false, error: "Quote not found" }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: "Failed to delete quote" }, { status: 500 });
  }
}
