import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

function getCustomerFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; type: string };
    if (decoded.type !== "customer") return null;
    return decoded;
  } catch {
    return null;
  }
}

// GET - Get customer's reservations
export async function GET(req: NextRequest) {
  try {
    const tokenData = getCustomerFromToken(req);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const reservations = await prisma.reservation.findMany({
      where: { customerId: tokenData.id },
      orderBy: { createdAt: "desc" },
      include: { assignedDriver: true },
    });

    const formatted = reservations.map((r: typeof reservations[number]) => ({
      id: r.id,
      bookingId: r.bookingId,
      status: r.status,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone,
      serviceType: r.serviceType,
      vehicle: r.vehicle,
      passengers: r.passengers,
      childSeats: r.childSeats,
      etr407: r.etr407,
      serviceDate: r.serviceDate,
      serviceTime: r.serviceTime,
      pickupLocation: r.pickupLocation,
      stops: r.stops || "",
      dropoffLocation: r.dropoffLocation,
      distance: r.distance || "",
      duration: r.duration || "",
      rideFare: r.rideFare,
      subtotal: r.subtotal,
      hst: r.hst,
      gratuity: r.gratuity,
      total: r.total,
      paymentStatus: r.paymentStatus || "PENDING",
      statusUpdatedAt: r.statusUpdatedAt?.toISOString() || null,
      completedAt: r.completedAt?.toISOString() || null,
      createdAt: r.createdAt.toISOString(),
      driver: r.assignedDriver
        ? {
            name: r.assignedDriver.name,
            phone: r.assignedDriver.phone,
            photo: r.assignedDriver.photo,
            vehicle: r.assignedDriver.vehicle,
            vehiclePlate: r.assignedDriver.vehiclePlate,
            rating: r.assignedDriver.rating,
          }
        : null,
    }));

    return NextResponse.json({ success: true, reservations: formatted });
  } catch (error) {
    console.error("Reservations fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

// POST - Create a new reservation for customer
export async function POST(req: NextRequest) {
  try {
    const tokenData = getCustomerFromToken(req);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      serviceType,
      vehicle,
      passengers,
      childSeats,
      etr407,
      serviceDate,
      serviceTime,
      pickupLocation,
      stops,
      dropoffLocation,
      distance,
      duration,
      airline,
      flightNumber,
      flightNote,
      rideFare,
      stopCharge,
      childSeatCharge,
      subtotal,
      hst,
      gratuity,
      total,
      specialRequirements,
      firstName,
      lastName,
      phone,
      email,
      // Payment
      stripePaymentMethodId,
      stripeCustomerId,
      cardType,
      cardLast4,
    } = body;

    if (!serviceType || !vehicle || !serviceDate || !serviceTime || !pickupLocation || !dropoffLocation) {
      return NextResponse.json(
        { success: false, error: "Missing required reservation fields" },
        { status: 400 }
      );
    }

    // Generate booking ID
    const bookingId = `SARJ-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Get customer info for fallback
    const customer = await prisma.customer.findUnique({
      where: { id: tokenData.id },
    });

    const reservation = await prisma.reservation.create({
      data: {
        bookingId,
        status: "PENDING",
        customerId: tokenData.id,
        firstName: firstName || customer?.firstName || "",
        lastName: lastName || customer?.lastName || "",
        email: email || customer?.email || "",
        phone: phone || customer?.phone || "",
        serviceType,
        vehicle,
        passengers: passengers || 1,
        childSeats: childSeats || 0,
        etr407: etr407 || "No",
        serviceDate,
        serviceTime,
        pickupLocation,
        stops: stops || null,
        dropoffLocation,
        distance: distance || null,
        duration: duration || null,
        airline: airline || null,
        flightNumber: flightNumber || null,
        flightNote: flightNote || null,
        rideFare: rideFare || 0,
        stopCharge: stopCharge || 0,
        childSeatCharge: childSeatCharge || 0,
        subtotal: subtotal || 0,
        hst: hst || 0,
        gratuity: gratuity || 0,
        total: total || 0,
        specialRequirements: specialRequirements || null,
        stripePaymentMethodId: stripePaymentMethodId || null,
        stripeCustomerId: stripeCustomerId || null,
        cardType: cardType || null,
        cardLast4: cardLast4 || null,
        paymentStatus: stripePaymentMethodId ? "AUTHORIZED" : "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Reservation created successfully",
      bookingId: reservation.bookingId,
      reservationId: reservation.id,
    });
  } catch (error) {
    console.error("Create reservation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}
