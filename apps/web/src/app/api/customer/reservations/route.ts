import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { publishReservationFromDb } from "@/lib/realtime-bus";
import {
  calculateAppDistanceFare,
  APP_DEFAULT_GRATUITY_PERCENT,
} from "@/lib/reservation-pricing";

// GET - Get customer's reservations
export async function GET(req: NextRequest) {
  try {
    const tokenData = getCustomerFromRequest(req);
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

    const formatted = reservations.map((r: (typeof reservations)[number]) => ({
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
    const tokenData = getCustomerFromRequest(req);
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
      vehicleId,
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
      distanceMeters,
      pricePerKm: clientPricePerKm,
      gratuityPercent: clientGratuityPercent,
      airline,
      flightNumber,
      flightNote,
      specialRequirements,
      firstName,
      lastName,
      phone,
      email,
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

    const meters = Number(distanceMeters) || 0;
    if (meters <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid trip distance is required" },
        { status: 400 }
      );
    }

    let hourlyRate = 0;
    let pricePerKm = 0;
    const tierKey = typeof vehicleId === "string" ? vehicleId.trim() : "";
    if (tierKey) {
      const fleetRow = await prisma.appFleetVehicle.findFirst({
        where: {
          OR: [{ tierId: tierKey }, { id: tierKey }],
          isActive: true,
        },
        select: { pricePerKm: true, hourlyRate: true, title: true },
      });
      if (fleetRow) {
        hourlyRate = fleetRow.hourlyRate || 0;
        pricePerKm = fleetRow.pricePerKm || 0;
      }
    }
    if (hourlyRate <= 0 && pricePerKm <= 0) {
      const byTitle = await prisma.appFleetVehicle.findFirst({
        where: { title: vehicle, isActive: true },
        select: { pricePerKm: true, hourlyRate: true },
      });
      if (byTitle) {
        hourlyRate = byTitle.hourlyRate || 0;
        pricePerKm = byTitle.pricePerKm || 0;
      }
    }
    if (hourlyRate <= 0 && pricePerKm <= 0) {
      pricePerKm = Number(clientPricePerKm) || 0;
    }
    if (hourlyRate <= 0 && pricePerKm <= 0) {
      return NextResponse.json(
        { success: false, error: "Could not resolve vehicle pricing" },
        { status: 400 }
      );
    }

    const { getPricingConfig } = await import("@/lib/get-pricing-config");
    const { charges } = await getPricingConfig();

    const hasStop = typeof stops === "string" && stops.trim().length >= 3;
    const pricing = calculateAppDistanceFare({
      distanceMeters: meters,
      hourlyRate,
      pricePerKm,
      baseDistanceKm: charges.baseDistanceKm,
      extraKmRate: charges.extraKmRate,
      hasStop,
      childSeatCount: Number(childSeats) || 0,
      gratuityPercent: Number(clientGratuityPercent) || APP_DEFAULT_GRATUITY_PERCENT,
    });

    if (!pricing) {
      return NextResponse.json(
        { success: false, error: "Unable to calculate fare" },
        { status: 400 }
      );
    }

    const bookingId = `SARJ-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

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
        rideFare: pricing.rideFare,
        stopCharge: pricing.stopCharge,
        childSeatCharge: pricing.childSeatCharge,
        subtotal: pricing.subtotal,
        hst: pricing.hst,
        gratuity: pricing.gratuity,
        total: pricing.total,
        specialRequirements: specialRequirements || null,
        stripePaymentMethodId: stripePaymentMethodId || null,
        stripeCustomerId: stripeCustomerId || null,
        cardType: cardType || null,
        cardLast4: cardLast4 || null,
        paymentStatus: stripePaymentMethodId ? "AUTHORIZED" : "PENDING",
      },
    });

    await publishReservationFromDb(reservation.bookingId, "reservation_created");

    const { maybeBroadcastNewReservation } = await import("@/lib/live-auto");
    await maybeBroadcastNewReservation(reservation.bookingId);

    return NextResponse.json({
      success: true,
      message: "Reservation created successfully",
      bookingId: reservation.bookingId,
      reservationId: reservation.id,
      pricing: {
        rideFare: pricing.rideFare,
        stopCharge: pricing.stopCharge,
        childSeatCharge: pricing.childSeatCharge,
        subtotal: pricing.subtotal,
        hst: pricing.hst,
        gratuity: pricing.gratuity,
        gratuityPercent: pricing.gratuityPercent,
        total: pricing.total,
      },
    });
  } catch (error) {
    console.error("Create reservation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}
