import { NextRequest, NextResponse } from "next/server";
import { sanitizeInput, sanitizeArray, isValidEmail } from "@/lib/sanitize";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import prisma from "@/lib/prisma";
import { buildQuoteAdminEmail, buildQuoteUserEmail } from "@/lib/email-templates";
import { isEmailConfigured, sendTransactionalEmail } from "@/lib/email-delivery";
import { fleetData } from "@/data/fleet";

const QUOTE_SERVICE_TYPES = [
  { value: "airport-transportation", label: "Airport Transportation" },
  { value: "transfer", label: "Transfer" },
  { value: "hourly-as-directed", label: "Hourly/As Directed" },
  { value: "wedding-transportation", label: "Wedding Transportation" },
  { value: "corporate-business-travel", label: "Corporate and Business Travel" },
] as const;

const QUOTE_SERVICE_TYPE_SET = new Set<string>(QUOTE_SERVICE_TYPES.map((s) => s.value));
const FLEET_ID_SET = new Set(fleetData.map((v) => v.id));

function quoteRecipientEmail(): string | undefined {
  return (
    process.env.CONTACT_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    process.env.SMTP_USER?.trim() ||
    undefined
  );
}

function resolveServiceLabel(value: string): string {
  return QUOTE_SERVICE_TYPES.find((s) => s.value === value)?.label ?? value;
}

function resolveVehicleLabel(value: string): string {
  const vehicle = fleetData.find((v) => v.id === value);
  return vehicle ? `${vehicle.dropdownName} (${vehicle.name})` : value;
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`quote:${clientIp}`, { maxRequests: 5, windowMs: 60 * 1000 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${rateLimit.resetIn} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();

    const turnstileResult = await verifyTurnstile(body.turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return NextResponse.json({ error: turnstileResult.error }, { status: 403 });
    }

    const passengerName = sanitizeInput(body.passengerName);
    const passengers = sanitizeInput(body.passengers);
    const phone = sanitizeInput(body.phone);
    const phoneCode = sanitizeInput(body.phoneCode) || "+1";
    const email = sanitizeInput(body.email);
    const serviceType = sanitizeInput(body.serviceType);
    const vehicleType = sanitizeInput(body.vehicleType);
    const pickupLocation = sanitizeInput(body.pickupLocation);
    const dropoffLocation = sanitizeInput(body.dropoffLocation);
    const additionalNotes = sanitizeInput(body.additionalNotes);
    const stops = sanitizeArray(body.stops);

    if (
      !passengerName ||
      !passengers ||
      !phone ||
      !email ||
      !serviceType ||
      !vehicleType ||
      !pickupLocation ||
      !dropoffLocation
    ) {
      return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    if (!QUOTE_SERVICE_TYPE_SET.has(serviceType)) {
      return NextResponse.json({ error: "Please select a valid service type" }, { status: 400 });
    }

    if (!FLEET_ID_SET.has(vehicleType)) {
      return NextResponse.json({ error: "Please select a valid vehicle type" }, { status: 400 });
    }

    const serviceLabel = resolveServiceLabel(serviceType);
    const vehicleLabel = resolveVehicleLabel(vehicleType);
    const fullPhone = `${phoneCode}${phone}`;

    const quotePayload = {
      passengerName,
      passengers,
      email,
      phone: fullPhone,
      serviceType: serviceLabel,
      vehicleType: vehicleLabel,
      pickup: pickupLocation,
      dropoff: dropoffLocation,
      stops,
      notes: additionalNotes || undefined,
    };

    const adminEmailHtml = buildQuoteAdminEmail(quotePayload);
    const userEmailHtml = buildQuoteUserEmail(quotePayload);

    const adminTo = quoteRecipientEmail();
    if (!isEmailConfigured() || !adminTo) {
      return NextResponse.json(
        { error: "Email service is not configured. Please try again later or call us directly." },
        { status: 503 }
      );
    }

    const adminSent = await sendTransactionalEmail({
      to: adminTo,
      replyTo: email,
      subject: `New online quote: ${passengerName} - ${serviceLabel}`,
      html: adminEmailHtml,
      logLabel: "quote-admin",
    });
    const userSent = await sendTransactionalEmail({
      to: email,
      subject: "We received your quote request - SARJ Worldwide",
      html: userEmailHtml,
      logLabel: "quote-user",
    });
    if (!adminSent || !userSent) {
      console.error("Quote form: email incomplete", { adminSent, userSent });
      return NextResponse.json(
        { error: "Failed to send email. Please try again later." },
        { status: 500 }
      );
    }

    const quoteId = `QT-${Date.now().toString(36).toUpperCase()}`;
    await prisma.quote.create({
      data: {
        quoteId,
        passengerName,
        passengers,
        phone: fullPhone,
        email,
        serviceType: serviceLabel,
        vehicle: vehicleLabel,
        pickupLocation,
        stops: stops.length > 0 ? stops.join(" | ") : null,
        dropoffLocation,
        additionalNotes: additionalNotes || null,
        status: "NEW",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your quote request has been sent successfully!",
    });
  } catch (error: unknown) {
    console.error("Quote email error:", error);
    const err = error as { code?: string; message?: string };
    let errorMessage = "Failed to send quote. Please try again later.";
    if (err.code === "EAUTH") errorMessage = "Email authentication failed.";
    else if (err.code === "ECONNECTION" || err.code === "ESOCKET") {
      errorMessage = "Could not connect to email server.";
    }
    return NextResponse.json({ error: errorMessage, details: err.message }, { status: 500 });
  }
}
