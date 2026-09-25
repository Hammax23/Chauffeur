import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { getActiveCustomerFromRequest, customerAuthFailurePayload } from "@/lib/customer-auth";
import { publishReservationFromDb } from "@/lib/realtime-bus";
import { serializeCustomerDriver } from "@/lib/customer-visible-driver";
import {
  fareTotalCents,
  resolveAppReservationFare,
} from "@/lib/app-reservation-fare";
import { recordPromotionRedemption } from "@/lib/promotions";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

// GET - Get customer's reservations
// Optional: ?scope=history&page=1&limit=20&q=search&status=DONE|CANCELLED|ALL
export async function GET(req: NextRequest) {
  try {
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }
    const tokenData = auth.customer;

    const { searchParams } = new URL(req.url);
    const scope = (searchParams.get("scope") || "").toLowerCase();
    const q = (searchParams.get("q") || "").trim();
    const statusFilter = (searchParams.get("status") || "ALL").toUpperCase();
    const pageRaw = parseInt(searchParams.get("page") || "", 10);
    const limitRaw = parseInt(searchParams.get("limit") || "", 10);
    const paginate = Number.isFinite(pageRaw) && pageRaw >= 1 && Number.isFinite(limitRaw) && limitRaw >= 1;
    const page = paginate ? pageRaw : 1;
    const limit = paginate ? Math.min(50, limitRaw) : undefined;

    const historyStatuses = ["DONE", "CANCELLED", "CANCELED"] as const;
    const where: Record<string, unknown> = {
      customerId: tokenData.id,
      // Soft-hidden past trips never appear in customer lists
      customerHistoryHiddenAt: null,
    };

    if (scope === "history") {
      if (statusFilter === "DONE") {
        where.status = "DONE";
      } else if (statusFilter === "CANCELLED" || statusFilter === "CANCELED") {
        where.status = { in: ["CANCELLED", "CANCELED"] };
      } else {
        where.status = { in: [...historyStatuses] };
      }
    }

    if (q) {
      where.OR = [
        { bookingId: { contains: q, mode: "insensitive" } },
        { pickupLocation: { contains: q, mode: "insensitive" } },
        { dropoffLocation: { contains: q, mode: "insensitive" } },
        { vehicle: { contains: q, mode: "insensitive" } },
        { serviceDate: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, reservations] = await Promise.all([
      paginate
        ? prisma.reservation.count({ where: where as never })
        : Promise.resolve(0),
      prisma.reservation.findMany({
        where: where as never,
        orderBy: { createdAt: "desc" },
        include: { assignedDriver: true, tripReview: true },
        ...(paginate ? { skip: (page - 1) * (limit as number), take: limit } : {}),
      }),
    ]);

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
      driver: serializeCustomerDriver(r.status, r.assignedDriver, r.driverResponse),
      review: r.tripReview
        ? {
            stars: r.tripReview.stars,
            comment: r.tripReview.comment,
            createdAt: r.tripReview.createdAt.toISOString(),
          }
        : null,
      canReview:
        r.status === "DONE" && !!r.assignedDriverId && !r.tripReview,
    }));

    if (!paginate) {
      return NextResponse.json({ success: true, reservations: formatted });
    }

    const hasMore = page * (limit as number) < total;
    return NextResponse.json({
      success: true,
      reservations: formatted,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    });
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
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }
    const tokenData = auth.customer;

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
      bookingMode: rawBookingMode,
      hourlyDuration: rawHourlyDuration,
      promoCode: rawPromoCode,
    } = body;

    const bookingMode =
      String(rawBookingMode || "").toLowerCase() === "hourly" ? "hourly" : "distance";
    const hourlyDuration = Math.max(3, Math.floor(Number(rawHourlyDuration) || 3));
    const resolvedDropoff =
      typeof dropoffLocation === "string" && dropoffLocation.trim()
        ? dropoffLocation.trim()
        : bookingMode === "hourly"
          ? "As directed"
          : "";

    if (!serviceType || !vehicle || !serviceDate || !serviceTime || !pickupLocation) {
      return NextResponse.json(
        { success: false, error: "Missing required reservation fields" },
        { status: 400 }
      );
    }
    if (bookingMode === "distance" && !resolvedDropoff) {
      return NextResponse.json(
        { success: false, error: "Drop-off location is required" },
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
      bookingMode,
      hourlyDuration,
      promoCode: rawPromoCode,
      customerId: tokenData.id,
    });
    if ("error" in fare) {
      return NextResponse.json({ success: false, error: fare.error }, { status: 400 });
    }
    const pricing = fare.pricing;
    const expectedAmountCents = fareTotalCents(pricing.total);

    const modeNote =
      bookingMode === "hourly"
        ? `Booking mode: Hourly · ${hourlyDuration} hours`
        : "Booking mode: Distance";
    const baseRequirements =
      typeof specialRequirements === "string" && specialRequirements.trim()
        ? specialRequirements.trim()
        : "";
    let storedRequirements = [baseRequirements, modeNote]
      .filter((line) => line && String(line).trim())
      .join("\n");

    // Temporary testing mode: allow unpaid app reservations (PENDING).
    // When a PaymentIntent is provided, still verify and mark PAID.
    let paymentStatus = "PENDING";
    let resolvedCardLast4: string | null = cardLast4 || null;
    let resolvedCardType: string | null = cardType || null;
    let resolvedStripePaymentMethodId: string | null = stripePaymentMethodId || null;
    let resolvedStripeCustomerId: string | null = stripeCustomerId || null;

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
      storedRequirements = [baseRequirements, modeNote, `Stripe payment: ${paymentIntentId}`]
        .filter((line) => line && String(line).trim())
        .join("\n");

      const bookingId = `SARJ-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://sarjworldwide.ca").replace(
        /\/$/,
        ""
      );
      const trackLink = `${siteBase}/track/${bookingId}`;

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
          dropoffLocation: resolvedDropoff,
          distance:
            bookingMode === "hourly"
              ? `Hourly · ${hourlyDuration}h`
              : distance || null,
          duration:
            bookingMode === "hourly"
              ? `${hourlyDuration} hours`
              : duration || null,
          airline: airline || null,
          flightNumber: flightNumber || null,
          flightNote: flightNote || null,
          rideFare: pricing.rideFare,
          stopCharge: pricing.stopCharge,
          childSeatCharge: pricing.childSeatCharge,
          subtotal: pricing.subtotal,
          discountAmount: pricing.discountAmount || 0,
          promoCode: pricing.promoCode || null,
          hst: pricing.hst,
          gratuity: pricing.gratuity,
          total: pricing.total,
          specialRequirements: storedRequirements || null,
          trackLink,
          stripePaymentMethodId: resolvedStripePaymentMethodId,
          stripeCustomerId: resolvedStripeCustomerId,
          cardType: resolvedCardType,
          cardLast4: resolvedCardLast4,
          paymentStatus,
        },
      });

      if (pricing.promotionId && pricing.discountAmount > 0) {
        try {
          await recordPromotionRedemption({
            promotionId: pricing.promotionId,
            customerId: tokenData.id,
            reservationId: reservation.id,
          });
        } catch (redeemErr) {
          console.error("[app-reservation] promo redemption failed:", redeemErr);
        }
      }

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
        trackLink,
        pricing: {
          rideFare: pricing.rideFare,
          stopCharge: pricing.stopCharge,
          childSeatCharge: pricing.childSeatCharge,
          subtotal: pricing.subtotal,
          discountAmount: pricing.discountAmount,
          promoCode: pricing.promoCode,
          hst: pricing.hst,
          gratuity: pricing.gratuity,
          gratuityPercent: pricing.gratuityPercent,
          total: pricing.total,
        },
      });
    }

    const bookingId = `SARJ-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://sarjworldwide.ca").replace(
      /\/$/,
      ""
    );
    const trackLink = `${siteBase}/track/${bookingId}`;

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
        dropoffLocation: resolvedDropoff,
        distance:
          bookingMode === "hourly"
            ? `Hourly · ${hourlyDuration}h`
            : distance || null,
        duration:
          bookingMode === "hourly"
            ? `${hourlyDuration} hours`
            : duration || null,
        airline: airline || null,
        flightNumber: flightNumber || null,
        flightNote: flightNote || null,
        rideFare: pricing.rideFare,
        stopCharge: pricing.stopCharge,
        childSeatCharge: pricing.childSeatCharge,
        subtotal: pricing.subtotal,
        discountAmount: pricing.discountAmount || 0,
        promoCode: pricing.promoCode || null,
        hst: pricing.hst,
        gratuity: pricing.gratuity,
        total: pricing.total,
        specialRequirements: storedRequirements || null,
        trackLink,
        stripePaymentMethodId: null,
        stripeCustomerId: null,
        cardType: null,
        cardLast4: null,
        paymentStatus: "PENDING",
      },
    });

    if (pricing.promotionId && pricing.discountAmount > 0) {
      try {
        await recordPromotionRedemption({
          promotionId: pricing.promotionId,
          customerId: tokenData.id,
          reservationId: reservation.id,
        });
      } catch (redeemErr) {
        console.error("[app-reservation] promo redemption failed:", redeemErr);
        // Unpaid booking — roll back so limits cannot be bypassed
        try {
          await prisma.reservation.delete({ where: { id: reservation.id } });
        } catch {
          /* ignore */
        }
        const msg =
          redeemErr instanceof Error && redeemErr.message
            ? redeemErr.message
            : "This promo code could not be applied. Please try again.";
        return NextResponse.json({ success: false, error: msg }, { status: 400 });
      }
    }

    await publishReservationFromDb(reservation.bookingId, "reservation_created");

    const { maybeBroadcastNewReservation } = await import("@/lib/live-auto");
    await maybeBroadcastNewReservation(reservation.bookingId);

    return NextResponse.json({
      success: true,
      message: "Reservation created successfully",
      bookingId: reservation.bookingId,
      reservationId: reservation.id,
      trackLink,
      pricing: {
        rideFare: pricing.rideFare,
        stopCharge: pricing.stopCharge,
        childSeatCharge: pricing.childSeatCharge,
        subtotal: pricing.subtotal,
        discountAmount: pricing.discountAmount,
        promoCode: pricing.promoCode,
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
