import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import Stripe from "stripe";
import { sanitizeInput, sanitizeArray } from "@/lib/sanitize";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { addReservation } from "@/lib/data-store";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { verifyOperationalManagerAuth } from "@/lib/operational-manager-auth";
import { buildReservationAdminEmail, buildReservationUserEmail } from "@/lib/email-templates";
import { calculateReservationPricing } from "@/lib/reservation-pricing";
import { getPricingConfig } from "@/lib/get-pricing-config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 requests per minute per IP
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`reservation:${clientIp}`, { maxRequests: 5, windowMs: 60 * 1000 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${rateLimit.resetIn} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Staff-only path (admin or operational manager). Never allow public skip of Turnstile.
    const wantsSkipTurnstile = body.skipTurnstile === true;
    if (wantsSkipTurnstile) {
      const adminAuth = await verifyAdminAuth(request);
      if (!adminAuth.authenticated) {
        const opsAuth = await verifyOperationalManagerAuth(request);
        if (!opsAuth.authenticated) {
          return NextResponse.json(
            { error: "Sign in as admin or operational manager to create a reservation without verification." },
            { status: 401 }
          );
        }
      }
    } else {
      const turnstileResult = await verifyTurnstile(body.turnstileToken, clientIp);
      if (!turnstileResult.success) {
        return NextResponse.json({ error: turnstileResult.error }, { status: 403 });
      }
    }

    // Sanitize all inputs
    const firstName = sanitizeInput(body.firstName);
    const lastName = sanitizeInput(body.lastName);
    const email = sanitizeInput(body.email);
    const phone = sanitizeInput(body.phone);
    const phoneCode = sanitizeInput(body.phoneCode);
    const serviceType = sanitizeInput(body.serviceType);
    const pickupLocation = sanitizeInput(body.pickupLocation);
    const dropoffLocation = sanitizeInput(body.dropoffLocation);
    const serviceDate = sanitizeInput(body.serviceDate);
    const serviceTime = sanitizeInput(body.serviceTime);
    const vehicle = sanitizeInput(body.vehicle);
    const vehicleId = sanitizeInput(body.vehicleId);
    const passengers = typeof body.passengers === "number" ? body.passengers : parseInt(sanitizeInput(body.passengers)) || 1;
    const bookingMode = sanitizeInput(body.bookingMode) === "hourly" ? "hourly" : "distance";
    const transferType = sanitizeInput(body.transferType) || "oneWay";
    const adultsCount = typeof body.adultsCount === "number" ? body.adultsCount : 1;
    const childrenCount = typeof body.childrenCount === "number" ? body.childrenCount : 0;
    const hourlyDuration = typeof body.hourlyDuration === "number" ? body.hourlyDuration : 3;
    const returnDateTime = sanitizeInput(body.returnDateTime);
    const childSeatCount = typeof body.childSeatCount === "number" ? body.childSeatCount : 0;
    const childSeatType = sanitizeInput(body.childSeatType);
    const etr407 = body.etr407 === true;
    const meetGreet = body.meetGreet === true;
    const bouquetFlowers = body.bouquetFlowers === true;
    const specialRequirements = sanitizeInput(body.specialRequirements);
    const routeDistance = sanitizeInput(body.routeDistance);
    const routeDuration = sanitizeInput(body.routeDuration);
    const routeDistanceValue = typeof body.routeDistanceValue === "number" ? body.routeDistanceValue : 0;
    const routePrice = typeof body.routePrice === "number" ? body.routePrice : 0;
    const gratuityPercent = typeof body.gratuityPercent === "number" ? body.gratuityPercent : 15;
    const stops = sanitizeArray(body.stops);
    const airlineName = sanitizeInput(body.airlineName);
    const flightNumber = sanitizeInput(body.flightNumber);
    const flightNote = sanitizeInput(body.flightNote);
    const cardType = sanitizeInput(body.cardType);
    const nameOnCard = sanitizeInput(body.nameOnCard);
    const cardFullNumber = sanitizeInput(body.cardFullNumber);
    const expirationMonth = sanitizeInput(body.expirationMonth);
    const expirationYear = sanitizeInput(body.expirationYear);
    const billingAddress = sanitizeInput(body.billingAddress);
    const zipCode = sanitizeInput(body.zipCode);
    const purchaseOrder = sanitizeInput(body.purchaseOrder);
    const deptNumber = sanitizeInput(body.deptNumber);
    const stripeCustomerId = sanitizeInput(body.stripeCustomerId);
    const stripePaymentMethodId = sanitizeInput(body.stripePaymentMethodId);
    const stripePaymentIntentId = sanitizeInput(body.stripePaymentIntentId);
    const cardLast4 = sanitizeInput(body.cardLast4);
    const checkoutPaymentMethod =
      sanitizeInput(body.paymentMethod) === "cash" ? "cash" : "card";

    if (!firstName || !lastName || !email || !phone || !pickupLocation || !serviceDate || !serviceTime || !vehicle) {
      return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
    }

    if (bookingMode === "distance" && !dropoffLocation) {
      return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
    }

    if (!wantsSkipTurnstile && checkoutPaymentMethod === "card" && !stripePaymentIntentId) {
      return NextResponse.json({ error: "Payment is required to complete this reservation." }, { status: 400 });
    }

    const fullName = `${firstName} ${lastName}`;
    const fullPhone = `${phoneCode}${phone}`;

    // Generate unique booking ID
    const bookingId = `SARJ-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sarjworldwide.ca";
    const driverLink = `${baseUrl}/driver/${bookingId}`;
    const customerTrackLink = `${baseUrl}/track/${bookingId}`;
    const adminLink = `${baseUrl}/admin`;

    let formattedDateTime = "--";
    try {
      formattedDateTime = new Date(`${serviceDate}T${serviceTime}`).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
    } catch {}

    // Billing calculations
    const activeStops = stops ? stops.length : 0;
    let stopCharge = activeStops * 20;
    let childSeatCharge = childSeatCount * 25;
    let meetGreetCharge = meetGreet ? 95 : 0;
    let bouquetCharge = bouquetFlowers ? 75 : 0;
    let rideFare = routePrice;
    let subtotal = rideFare + stopCharge + childSeatCharge + meetGreetCharge + bouquetCharge;
    let hst = subtotal * 0.13;
    let gratuity = (subtotal * gratuityPercent) / 100;
    let total = subtotal + hst + gratuity;

    let paymentStatus = "PENDING";
    let resolvedStripeCustomerId = stripeCustomerId;
    let resolvedStripePaymentMethodId = stripePaymentMethodId;
    let resolvedCardLast4 = cardLast4;
    let resolvedCardType = cardType;
    let resolvedPaymentIntentId = stripePaymentIntentId;

    if (!wantsSkipTurnstile) {
      const pricingConfig = await getPricingConfig();
      const serverPricing = calculateReservationPricing(
        {
          vehicleId,
          bookingMode,
          distanceMeters: routeDistanceValue,
          hourlyDuration,
          stopCount: activeStops,
          childSeatCount,
          meetGreet,
          bouquetFlowers,
          gratuityPercent,
        },
        pricingConfig.fleet,
        pricingConfig.charges
      );

      if (!serverPricing) {
        return NextResponse.json({ error: "Unable to verify booking price." }, { status: 400 });
      }

      rideFare = serverPricing.rideFare;
      stopCharge = serverPricing.stopCharge;
      childSeatCharge = serverPricing.childSeatCharge;
      meetGreetCharge = serverPricing.meetGreetCharge;
      bouquetCharge = serverPricing.bouquetCharge;
      subtotal = serverPricing.subtotal;
      hst = serverPricing.hst;
      gratuity = serverPricing.gratuity;
      total = serverPricing.total;

      if (checkoutPaymentMethod === "cash") {
        paymentStatus = "CASH_ON_DELIVERY";
        resolvedCardType = "Cash on Delivery";
        resolvedCardLast4 = "";
        resolvedStripeCustomerId = "";
        resolvedStripePaymentMethodId = "";
        resolvedPaymentIntentId = "";
      } else {
        const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId, {
          expand: ["payment_method"],
        });

        if (paymentIntent.status !== "succeeded") {
          return NextResponse.json({ error: "Payment has not been completed." }, { status: 400 });
        }

        const expectedAmountCents = Math.round(serverPricing.total * 100);
        if (paymentIntent.amount !== expectedAmountCents) {
          return NextResponse.json({ error: "Payment amount does not match booking total." }, { status: 400 });
        }

        paymentStatus = "PAID";

        const paymentMethod = paymentIntent.payment_method as Stripe.PaymentMethod | null;
        if (paymentMethod?.card) {
          resolvedCardLast4 = paymentMethod.card.last4;
          resolvedCardType = paymentMethod.card.brand || resolvedCardType;
        }
        resolvedStripePaymentMethodId =
          typeof paymentIntent.payment_method === "string"
            ? paymentIntent.payment_method
            : paymentMethod?.id || resolvedStripePaymentMethodId;
        resolvedStripeCustomerId =
          typeof paymentIntent.customer === "string"
            ? paymentIntent.customer
            : paymentIntent.customer?.id || resolvedStripeCustomerId;
      }
    }

    const priceDisplay = total > 0 ? `$${total.toFixed(2)} CAD` : "To be confirmed";

    // Generate .ics calendar file for admin email
    let icsContent = "";
    try {
      const startDate = new Date(`${serviceDate}T${serviceTime}`);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours
      const formatIcsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//SARJ Worldwide//Reservation//EN",
        "BEGIN:VEVENT",
        `DTSTART:${formatIcsDate(startDate)}`,
        `DTEND:${formatIcsDate(endDate)}`,
        `SUMMARY:ðŸš— ${bookingId} â€” ${fullName}`,
        `DESCRIPTION:Booking: ${bookingId}\\nPassenger: ${fullName}\\nPhone: ${fullPhone}\\nVehicle: ${vehicle}\\nPick-up: ${pickupLocation}\\nDrop-off: ${dropoffLocation}\\nTotal: ${priceDisplay}\\n\\nDriver Link: ${driverLink}\\nTrack Link: ${customerTrackLink}`,
        `LOCATION:${pickupLocation}`,
        `UID:${bookingId}@sarjworldwide.ca`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");
    } catch {};

    const currentDate = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });

    const reservationEmailData = {
      bookingId,
      fullName,
      email,
      phone: fullPhone,
      passengers,
      bookingMode,
      transferType,
      adultsCount,
      childrenCount,
      hourlyDuration,
      returnDateTime: returnDateTime || undefined,
      childSeatCount,
      childSeatType: childSeatType || undefined,
      serviceType: serviceType || undefined,
      vehicle,
      formattedDateTime,
      pickup: pickupLocation,
      dropoff: dropoffLocation,
      stops,
      distance: routeDistance || undefined,
      duration: routeDuration || undefined,
      etr407,
      meetGreet,
      bouquetFlowers,
      airline: airlineName || undefined,
      flightNumber: flightNumber || undefined,
      flightNote: flightNote || undefined,
      routePrice: rideFare,
      stopCharge,
      childSeatCharge,
      meetGreetCharge,
      bouquetCharge,
      activeStops,
      subtotal,
      hst,
      gratuity,
      gratuityPercent,
      priceDisplay,
      specialRequirements: [meetGreet ? "Meet & Greet: Yes" : "", bouquetFlowers ? "Bouquet of Flowers: Yes" : "", specialRequirements].filter(Boolean).join("\n") || undefined,
      cardType: resolvedCardType || undefined,
      nameOnCard: nameOnCard || undefined,
      cardFullNumber: cardFullNumber || undefined,
      expirationMonth: expirationMonth || undefined,
      expirationYear: expirationYear || undefined,
      billingAddress: billingAddress || undefined,
      zipCode: zipCode || undefined,
      purchaseOrder: purchaseOrder || undefined,
      deptNumber: deptNumber || undefined,
      paymentMethodLabel:
        checkoutPaymentMethod === "cash" ? "Cash on Delivery" : "Card (paid online)",
      paymentStatusLabel: paymentStatus,
      driverLink,
      customerTrackLink,
      adminLink,
    };

    const adminEmailHtml = buildReservationAdminEmail(reservationEmailData);
    const userEmailHtml = buildReservationUserEmail(reservationEmailData);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      tls: { rejectUnauthorized: false },
    });

    await transporter.verify();

    // Admin email with .ics calendar attachment
    const adminMailOptions: any = {
      from: `"SARJ Website" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL,
      subject: `ðŸ“‹ ${bookingId} â€” ${fullName} â€” ${vehicle} â€” ${formattedDateTime}`,
      html: adminEmailHtml,
    };
    if (icsContent) {
      adminMailOptions.attachments = [{
        filename: `${bookingId}.ics`,
        content: icsContent,
        contentType: "text/calendar; method=REQUEST",
      }];
    }
    await transporter.sendMail(adminMailOptions);

    await transporter.sendMail({
      from: `"SARJ WORLDWIDE" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Booking ${bookingId} â€” Your Reservation is Confirmed â€” SARJ WORLDWIDE`,
      html: userEmailHtml,
    });

    // Save reservation to local data store
    await addReservation({
      bookingId,
      dateSubmitted: currentDate,
      status: "PENDING",
      firstName,
      lastName,
      email,
      phone: fullPhone,
      serviceType,
      bookingMode,
      transferType,
      adultsCount,
      childrenCount,
      hourlyDuration,
      returnDateTime,
      vehicle,
      passengers,
      childSeats: childSeatCount,
      childSeatType,
      etr407: etr407 ? "Yes" : "No",
      meetGreet: meetGreet ? "Yes" : "No",
      bouquetFlowers: bouquetFlowers ? "Yes" : "No",
      serviceDate,
      serviceTime,
      pickupLocation,
      stops: stops?.join(", ") || "",
      dropoffLocation,
      distance: routeDistance,
      duration: routeDuration,
      airline: airlineName,
      flightNumber,
      flightNote,
      rideFare,
      stopCharge,
      childSeatCharge,
      meetGreetCharge,
      bouquetCharge,
      subtotal,
      hst,
      gratuity,
      total,
      specialRequirements: [meetGreet ? "Meet & Greet: Yes" : "", bouquetFlowers ? "Bouquet of Flowers: Yes" : "", specialRequirements].filter(Boolean).join("\n") || "",
      driverLink,
      trackLink: customerTrackLink,
      stripeCustomerId: resolvedStripeCustomerId,
      stripePaymentMethodId: resolvedStripePaymentMethodId,
      stripePaymentIntentId: resolvedPaymentIntentId || undefined,
      cardType: resolvedCardType,
      cardLast4: resolvedCardLast4,
      paymentStatus,
    });

    const { maybeBroadcastNewReservation } = await import("@/lib/live-auto");
    await maybeBroadcastNewReservation(bookingId);

    return NextResponse.json({ success: true, message: "Reservation submitted successfully!", bookingId });
  } catch (error: any) {
    console.error("Reservation email error:", error);
    let errorMessage = "Failed to send reservation. Please try again later.";
    if (error.code === "EAUTH") errorMessage = "Email authentication failed.";
    else if (error.code === "ECONNECTION" || error.code === "ESOCKET") errorMessage = "Could not connect to email server.";
    return NextResponse.json({ error: errorMessage, details: error.message }, { status: 500 });
  }
}
