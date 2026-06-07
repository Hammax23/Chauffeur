import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { sanitizeInput, sanitizeArray } from "@/lib/sanitize";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { addReservation } from "@/lib/data-store";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { verifyOperationalManagerAuth } from "@/lib/operational-manager-auth";
import { buildReservationAdminEmail, buildReservationUserEmail } from "@/lib/email-templates";

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
    const passengers = typeof body.passengers === "number" ? body.passengers : parseInt(sanitizeInput(body.passengers)) || 1;
    const childSeatCount = typeof body.childSeatCount === "number" ? body.childSeatCount : 0;
    const childSeatType = sanitizeInput(body.childSeatType);
    const etr407 = body.etr407 === true;
    const specialRequirements = sanitizeInput(body.specialRequirements);
    const routeDistance = sanitizeInput(body.routeDistance);
    const routeDuration = sanitizeInput(body.routeDuration);
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
    const cardLast4 = sanitizeInput(body.cardLast4);

    if (!firstName || !lastName || !email || !phone || !pickupLocation || !dropoffLocation || !serviceDate || !serviceTime || !vehicle) {
      return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
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
    const stopCharge = activeStops * 20;
    const childSeatCharge = childSeatCount * 25;
    const subtotal = routePrice + stopCharge + childSeatCharge;
    const hst = subtotal * 0.13;
    const gratuity = subtotal * gratuityPercent / 100;
    const total = subtotal + hst + gratuity;

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
      airline: airlineName || undefined,
      flightNumber: flightNumber || undefined,
      flightNote: flightNote || undefined,
      routePrice,
      stopCharge,
      childSeatCharge,
      activeStops,
      subtotal,
      hst,
      gratuity,
      gratuityPercent,
      priceDisplay,
      specialRequirements: specialRequirements || undefined,
      cardType: cardType || undefined,
      nameOnCard: nameOnCard || undefined,
      cardFullNumber: cardFullNumber || undefined,
      expirationMonth: expirationMonth || undefined,
      expirationYear: expirationYear || undefined,
      billingAddress: billingAddress || undefined,
      zipCode: zipCode || undefined,
      purchaseOrder: purchaseOrder || undefined,
      deptNumber: deptNumber || undefined,
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
    addReservation({
      bookingId,
      dateSubmitted: currentDate,
      status: "PENDING",
      firstName,
      lastName,
      email,
      phone: fullPhone,
      serviceType,
      vehicle,
      passengers,
      childSeats: childSeatCount,
      childSeatType,
      etr407: etr407 ? "Yes" : "No",
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
      rideFare: routePrice,
      stopCharge,
      childSeatCharge,
      subtotal,
      hst,
      gratuity,
      total,
      specialRequirements,
      driverLink,
      trackLink: customerTrackLink,
      stripeCustomerId,
      stripePaymentMethodId,
      cardType,
      cardLast4,
      paymentStatus: "PENDING",
    });

    return NextResponse.json({ success: true, message: "Reservation submitted successfully!", bookingId });
  } catch (error: any) {
    console.error("Reservation email error:", error);
    let errorMessage = "Failed to send reservation. Please try again later.";
    if (error.code === "EAUTH") errorMessage = "Email authentication failed.";
    else if (error.code === "ECONNECTION" || error.code === "ESOCKET") errorMessage = "Could not connect to email server.";
    return NextResponse.json({ error: errorMessage, details: error.message }, { status: 500 });
  }
}
