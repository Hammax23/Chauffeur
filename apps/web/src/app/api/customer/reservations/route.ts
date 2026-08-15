import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { publishReservationFromDb } from "@/lib/realtime-bus";
import {
  fareTotalCents,
  resolveAppReservationFare,
} from "@/lib/app-reservation-fare";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

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
      stripePaymentIntentId,
      cardType,
      cardLast4,
    } = body;

    if (!serviceType || !vehicle || !serviceDate || !serviceTime || !pickupLocation || !dropoffLocation) {
      return NextResponse.json(
        { success: false, error: "Missing required reservation fields" },
        { status: 400 }
      );
    }

    const paymentIntentId =
      typeof stripePaymentIntentId === "string" ? stripePaymentIntentId.trim() : "";

    const fare = await resolveAppReservationFare({
      vehicleId,
      vehicle,
      distanceMeters,
      stops,
      childSeats,
      gratuityPercent: clientGratuityPercent,
      pickupLocation,
    });
    if ("error" in fare) {
      return NextResponse.json({ success: false, error: fare.error }, { status: 400 });
    }
    const pricing = fare.pricing;
    const expectedAmountCents = fareTotalCents(pricing.total);

    // Temporary testing mode: allow unpaid app reservations (PENDING).
    // When a PaymentIntent is provided, still verify and mark PAID.
    let paymentStatus = "PENDING";
    let resolvedCardLast4: string | null = cardLast4 || null;
    let resolvedCardType: string | null = cardType || null;
    let resolvedStripePaymentMethodId: string | null = stripePaymentMethodId || null;
    let resolvedStripeCustomerId: string | null = stripeCustomerId || null;
    let storedRequirements =
      typeof specialRequirements === "string" && specialRequirements.trim()
        ? specialRequirements.trim()
        : null;

    if (paymentIntentId) {
      if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json(
          { success: false, error: "Payments are temporarily unavailable." },
          { status: 503 }
        );
      }

      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["payment_method"],
      });

      if (paymentIntent.status !== "succeeded") {
        return NextResponse.json(
          { success: false, error: "Payment has not been completed." },
          { status: 400 }
        );
      }
      if (paymentIntent.amount !== expectedAmountCents) {
        return NextResponse.json(
          { success: false, error: "Payment amount does not match booking total." },
          { status: 400 }
        );
      }
      if (paymentIntent.metadata?.customerId && paymentIntent.metadata.customerId !== tokenData.id) {
        return NextResponse.json(
          { success: false, error: "Payment does not match this account." },
          { status: 400 }
        );
      }
      if (paymentIntent.metadata?.bookingId) {
        return NextResponse.json(
          { success: false, error: "This payment has already been used." },
          { status: 400 }
        );
      }

      const alreadyUsed = await prisma.reservation.findFirst({
        where: { specialRequirements: { contains: paymentIntentId } },
        select: { id: true },
      });
      if (alreadyUsed) {
        return NextResponse.json(
          { success: false, error: "This payment has already been used." },
          { status: 400 }
        );
      }

      const paymentMethod = paymentIntent.payment_method as Stripe.PaymentMethod | null;
      resolvedCardLast4 = paymentMethod?.card?.last4 || cardLast4 || null;
      resolvedCardType = paymentMethod?.card?.brand || cardType || null;
      resolvedStripePaymentMethodId =
        typeof paymentIntent.payment_method === "string"
          ? paymentIntent.payment_method
          : paymentMethod?.id || stripePaymentMethodId || null;
      resolvedStripeCustomerId =
        typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : paymentIntent.customer?.id || stripeCustomerId || null;
      paymentStatus = "PAID";
      storedRequirements = [
        typeof specialRequirements === "string" ? specialRequirements : "",
        `Stripe payment: ${paymentIntentId}`,
      ]
        .filter((line) => line && String(line).trim())
        .join("\n");

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
          specialRequirements: storedRequirements || null,
          stripePaymentMethodId: resolvedStripePaymentMethodId,
          stripeCustomerId: resolvedStripeCustomerId,
          cardType: resolvedCardType,
          cardLast4: resolvedCardLast4,
          paymentStatus,
        },
      });

      try {
        await stripe.paymentIntents.update(paymentIntentId, {
          metadata: {
            ...paymentIntent.metadata,
            bookingId: reservation.bookingId,
          },
        });
      } catch (metaError) {
        console.error("[app-reservation] failed to stamp payment intent:", metaError);
      }

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
        specialRequirements: storedRequirements,
        stripePaymentMethodId: null,
        stripeCustomerId: null,
        cardType: null,
        cardLast4: null,
        paymentStatus: "PENDING",
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
    const detail =
      error instanceof Error && error.message
        ? error.message.slice(0, 240)
        : "Failed to create reservation";
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "development"
            ? detail
            : "Failed to create reservation",
      },
      { status: 500 }
    );
  }
}
