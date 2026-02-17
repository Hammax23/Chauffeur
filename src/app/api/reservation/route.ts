import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { sanitizeInput, sanitizeArray } from "@/lib/sanitize";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

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

    // Turnstile verification
    const turnstileResult = await verifyTurnstile(body.turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return NextResponse.json({ error: turnstileResult.error }, { status: 403 });
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

    if (!firstName || !lastName || !email || !phone || !pickupLocation || !dropoffLocation || !serviceDate || !serviceTime || !vehicle) {
      return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
    }

    const fullName = `${firstName} ${lastName}`;
    const fullPhone = `${phoneCode}${phone}`;
    const currentDate = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });

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

    const stopsRows = stops && stops.length > 0
      ? stops.map((s: string, i: number) => `<tr><td style="padding:10px 0;color:#666;font-size:14px;">Stop ${i+1}:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${s}</td></tr>`).join("")
      : "";

    const stopsUser = stops && stops.length > 0
      ? stops.map((s: string, i: number) => `<p style="color:#666;font-size:14px;margin:5px 0;"><strong>Stop ${i+1}:</strong> ${s}</p>`).join("")
      : "";

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
        `SUMMARY:🚗 ${bookingId} — ${fullName}`,
        `DESCRIPTION:Booking: ${bookingId}\\nPassenger: ${fullName}\\nPhone: ${fullPhone}\\nVehicle: ${vehicle}\\nPick-up: ${pickupLocation}\\nDrop-off: ${dropoffLocation}\\nTotal: ${priceDisplay}\\n\\nDriver Link: ${driverLink}\\nTrack Link: ${customerTrackLink}`,
        `LOCATION:${pickupLocation}`,
        `UID:${bookingId}@sarjworldwide.ca`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");
    } catch {};

    // Flight info section for admin email
    const flightInfoRows = (airlineName || flightNumber || flightNote) ? `
        <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h2 style="color:#1C1C1E;margin:0 0 15px;font-size:18px;border-bottom:2px solid #C9A063;padding-bottom:10px;">Flight Info</h2>
          <table style="width:100%;border-collapse:collapse;">
            ${airlineName ? `<tr><td style="padding:10px 0;color:#666;font-size:14px;width:140px;">Airline:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${airlineName}</td></tr>` : ""}
            ${flightNumber ? `<tr><td style="padding:10px 0;color:#666;font-size:14px;">Flight #:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${flightNumber}</td></tr>` : ""}
            ${flightNote ? `<tr><td style="padding:10px 0;color:#666;font-size:14px;">Note:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${flightNote}</td></tr>` : ""}
          </table>
        </div>` : "";

    // Flight info for customer email
    const flightInfoUser = (airlineName || flightNumber || flightNote) ? `
          ${airlineName ? `<p style="color:#666;font-size:14px;margin:5px 0;"><strong>Airline:</strong> ${airlineName}</p>` : ""}
          ${flightNumber ? `<p style="color:#666;font-size:14px;margin:5px 0;"><strong>Flight #:</strong> ${flightNumber}</p>` : ""}
          ${flightNote ? `<p style="color:#666;font-size:14px;margin:5px 0;"><strong>Flight Type:</strong> ${flightNote}</p>` : ""}` : "";

    const adminEmailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:linear-gradient(135deg,#C9A063,#A68B5B);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">New Reservation</h1>
        <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:14px;">SARJ Worldwide Chauffeur Service</p>
        <p style="color:#fff;margin:10px 0 0;font-size:18px;font-weight:700;letter-spacing:1px;">${bookingId}</p>
      </div>
      <div style="padding:30px;">
        <div style="background:#fff8ed;border:1px solid #C9A063;border-radius:12px;padding:15px;margin-bottom:20px;text-align:center;">
          <p style="margin:0 0 8px;color:#1C1C1E;font-size:14px;font-weight:600;">Quick Links</p>
          <a href="${driverLink}" style="display:inline-block;background:#C9A063;color:#fff;padding:8px 18px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;margin:4px 5px;">Driver Status Page</a>
          <a href="${customerTrackLink}" style="display:inline-block;background:#1C1C1E;color:#fff;padding:8px 18px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;margin:4px 5px;">Customer Track Link</a>
          <a href="${adminLink}" style="display:inline-block;background:#007AFF;color:#fff;padding:8px 18px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;margin:4px 5px;">Admin Dashboard</a>
        </div>
        <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h2 style="color:#1C1C1E;margin:0 0 15px;font-size:18px;border-bottom:2px solid #C9A063;padding-bottom:10px;">Passenger Details</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:10px 0;color:#666;font-size:14px;width:140px;">Name:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${fullName}</td></tr>
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">Passengers:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${passengers}</td></tr>
            ${childSeatCount > 0 ? `<tr><td style="padding:10px 0;color:#666;font-size:14px;">Child Seats:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${childSeatCount}${childSeatType ? ` (${childSeatType})` : ""}</td></tr>` : ""}
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">Email:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;"><a href="mailto:${email}" style="color:#C9A063;">${email}</a></td></tr>
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">Phone:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;"><a href="tel:${fullPhone}" style="color:#C9A063;">${fullPhone}</a></td></tr>
          </table>
        </div>
        <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h2 style="color:#1C1C1E;margin:0 0 15px;font-size:18px;border-bottom:2px solid #C9A063;padding-bottom:10px;">Trip Details</h2>
          <table style="width:100%;border-collapse:collapse;">
            ${serviceType ? `<tr><td style="padding:10px 0;color:#666;font-size:14px;width:140px;">Service Type:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${serviceType}</td></tr>` : ""}
            <tr><td style="padding:10px 0;color:#666;font-size:14px;width:140px;">Vehicle:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${vehicle}</td></tr>
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">Date & Time:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${formattedDateTime}</td></tr>
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">Pick-up:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${pickupLocation}</td></tr>
            ${stopsRows}
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">Drop-off:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${dropoffLocation}</td></tr>
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">Distance:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${routeDistance || "--"}</td></tr>
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">Duration:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${routeDuration || "--"}</td></tr>
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">407 ETR:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${etr407 ? '<span style="color:#C9A063;">Yes</span>' : 'No'}</td></tr>
          </table>
        </div>
        ${flightInfoRows}
        <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h2 style="color:#1C1C1E;margin:0 0 15px;font-size:18px;border-bottom:2px solid #C9A063;padding-bottom:10px;">Billing Breakdown</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#666;font-size:14px;width:180px;">Ride Fare:</td><td style="padding:8px 0;color:#1C1C1E;font-size:14px;font-weight:600;text-align:right;">$${routePrice.toFixed(2)}</td></tr>
            ${activeStops > 0 ? `<tr><td style="padding:8px 0;color:#666;font-size:14px;">Stops (${activeStops} x $20):</td><td style="padding:8px 0;color:#1C1C1E;font-size:14px;font-weight:600;text-align:right;">$${stopCharge.toFixed(2)}</td></tr>` : ""}
            ${childSeatCount > 0 ? `<tr><td style="padding:8px 0;color:#666;font-size:14px;">Child Seats (${childSeatCount} x $25):</td><td style="padding:8px 0;color:#1C1C1E;font-size:14px;font-weight:600;text-align:right;">$${childSeatCharge.toFixed(2)}</td></tr>` : ""}
            <tr><td style="padding:8px 0;color:#666;font-size:14px;font-weight:600;">Subtotal:</td><td style="padding:8px 0;color:#1C1C1E;font-size:14px;font-weight:600;text-align:right;">$${subtotal.toFixed(2)}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:14px;">HST (13%):</td><td style="padding:8px 0;color:#1C1C1E;font-size:14px;font-weight:600;text-align:right;">$${hst.toFixed(2)}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:14px;">Gratuity (${gratuityPercent}%):</td><td style="padding:8px 0;color:#1C1C1E;font-size:14px;font-weight:600;text-align:right;">$${gratuity.toFixed(2)}</td></tr>
            <tr style="border-top:2px solid #C9A063;"><td style="padding:12px 0;color:#1C1C1E;font-size:16px;font-weight:700;">Total:</td><td style="padding:12px 0;color:#C9A063;font-size:18px;font-weight:700;text-align:right;">${priceDisplay}</td></tr>
          </table>
        </div>
        ${(cardType || nameOnCard || cardFullNumber) ? `<div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h2 style="color:#1C1C1E;margin:0 0 15px;font-size:18px;border-bottom:2px solid #C9A063;padding-bottom:10px;">Payment Details</h2>
          <table style="width:100%;border-collapse:collapse;">
            ${cardType ? `<tr><td style="padding:8px 0;color:#666;font-size:14px;width:140px;">Card Type:</td><td style="padding:8px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${cardType}</td></tr>` : ""}
            ${nameOnCard ? `<tr><td style="padding:8px 0;color:#666;font-size:14px;">Name on Card:</td><td style="padding:8px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${nameOnCard}</td></tr>` : ""}
            ${cardFullNumber ? `<tr><td style="padding:8px 0;color:#666;font-size:14px;">Card Number:</td><td style="padding:8px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${cardFullNumber}</td></tr>` : ""}
            ${expirationMonth && expirationYear ? `<tr><td style="padding:8px 0;color:#666;font-size:14px;">Expiry:</td><td style="padding:8px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${expirationMonth}/${expirationYear}</td></tr>` : ""}
            ${billingAddress ? `<tr><td style="padding:8px 0;color:#666;font-size:14px;">Billing Address:</td><td style="padding:8px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${billingAddress}</td></tr>` : ""}
            ${zipCode ? `<tr><td style="padding:8px 0;color:#666;font-size:14px;">Zip Code:</td><td style="padding:8px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${zipCode}</td></tr>` : ""}
            ${purchaseOrder ? `<tr><td style="padding:8px 0;color:#666;font-size:14px;">Purchase Order:</td><td style="padding:8px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${purchaseOrder}</td></tr>` : ""}
            ${deptNumber ? `<tr><td style="padding:8px 0;color:#666;font-size:14px;">Dept Number:</td><td style="padding:8px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${deptNumber}</td></tr>` : ""}
          </table>
        </div>` : ""}
        ${specialRequirements ? `<div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:20px;"><h3 style="color:#1C1C1E;margin:0 0 10px;font-size:16px;">Special Requirements:</h3><p style="color:#444;font-size:14px;line-height:1.6;margin:0;">${specialRequirements}</p></div>` : ""}
        <div style="text-align:center;padding:20px 0;border-top:1px solid #eee;"><p style="color:#888;font-size:12px;margin:0;">Received on ${currentDate}</p></div>
      </div>
    </div></body></html>`;

    const userEmailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:linear-gradient(135deg,#C9A063,#A68B5B);padding:40px 30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">Reservation Confirmed!</h1>
        <p style="color:rgba(255,255,255,0.9);margin:15px 0 0;font-size:16px;">Your booking has been received</p>
      </div>
      <div style="padding:40px 30px;">
        <p style="color:#1C1C1E;font-size:16px;line-height:1.8;margin:0 0 20px;">Dear <strong>${fullName}</strong>,</p>
        <p style="color:#444;font-size:15px;line-height:1.8;margin:0 0 20px;">Your reservation has been <strong style="color:#C9A063;">successfully submitted</strong> to SARJ WORLDWIDE. Our team will confirm your booking shortly.</p>
        <div style="background:#fff8ed;border:1px solid #C9A063;border-radius:12px;padding:18px;margin:0 0 20px;text-align:center;">
          <p style="margin:0;color:#666;font-size:13px;">Your Booking ID</p>
          <p style="margin:5px 0 10px;color:#C9A063;font-size:22px;font-weight:700;letter-spacing:1px;">${bookingId}</p>
          <a href="${customerTrackLink}" style="display:inline-block;background:#C9A063;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Track Your Ride</a>
        </div>
        <div style="background:linear-gradient(135deg,#f8f9fa,#fff);border-radius:12px;padding:25px;margin:25px 0;border-left:4px solid #C9A063;">
          <h3 style="color:#1C1C1E;margin:0 0 15px;font-size:16px;">Your Reservation Summary:</h3>
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>Name:</strong> ${fullName}</p>
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>Passengers:</strong> ${passengers}</p>
          ${childSeatCount > 0 ? `<p style="color:#666;font-size:14px;margin:5px 0;"><strong>Child Seats:</strong> ${childSeatCount}${childSeatType ? ` (${childSeatType})` : ""}</p>` : ""}
          ${serviceType ? `<p style="color:#666;font-size:14px;margin:5px 0;"><strong>Service Type:</strong> ${serviceType}</p>` : ""}
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>Vehicle:</strong> ${vehicle}</p>
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>Date & Time:</strong> ${formattedDateTime}</p>
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>Pick-up:</strong> ${pickupLocation}</p>
          ${stopsUser}
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>Drop-off:</strong> ${dropoffLocation}</p>
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>Distance:</strong> ${routeDistance || "--"}</p>
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>Duration:</strong> ${routeDuration || "--"}</p>
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>407 ETR:</strong> ${etr407 ? 'Yes' : 'No'}</p>
          ${flightInfoUser}
        </div>
        <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:25px 0;">
          <h3 style="color:#1C1C1E;margin:0 0 12px;font-size:16px;">Billing Summary:</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#666;font-size:14px;">Ride Fare:</td><td style="padding:6px 0;color:#1C1C1E;font-size:14px;font-weight:600;text-align:right;">$${routePrice.toFixed(2)}</td></tr>
            ${activeStops > 0 ? `<tr><td style="padding:6px 0;color:#666;font-size:14px;">Stops (${activeStops} x $20):</td><td style="padding:6px 0;color:#1C1C1E;font-size:14px;font-weight:600;text-align:right;">$${stopCharge.toFixed(2)}</td></tr>` : ""}
            ${childSeatCount > 0 ? `<tr><td style="padding:6px 0;color:#666;font-size:14px;">Child Seats (${childSeatCount} x $25):</td><td style="padding:6px 0;color:#1C1C1E;font-size:14px;font-weight:600;text-align:right;">$${childSeatCharge.toFixed(2)}</td></tr>` : ""}
            <tr><td style="padding:6px 0;color:#666;font-size:14px;">Subtotal:</td><td style="padding:6px 0;color:#1C1C1E;font-size:14px;font-weight:600;text-align:right;">$${subtotal.toFixed(2)}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:14px;">HST (13%):</td><td style="padding:6px 0;color:#1C1C1E;font-size:14px;font-weight:600;text-align:right;">$${hst.toFixed(2)}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:14px;">Gratuity (${gratuityPercent}%):</td><td style="padding:6px 0;color:#1C1C1E;font-size:14px;font-weight:600;text-align:right;">$${gratuity.toFixed(2)}</td></tr>
            <tr style="border-top:2px solid #C9A063;"><td style="padding:10px 0;color:#1C1C1E;font-size:15px;font-weight:700;">Total:</td><td style="padding:10px 0;color:#C9A063;font-size:16px;font-weight:700;text-align:right;">${priceDisplay}</td></tr>
          </table>
        </div>
        <p style="color:#444;font-size:15px;line-height:1.8;margin:20px 0;">For urgent inquiries, call us at <a href="tel:+14168935779" style="color:#C9A063;font-weight:600;">416-893-5779</a>.</p>
        <p style="color:#444;font-size:15px;line-height:1.8;margin:20px 0 0;">Best regards,<br><strong style="color:#C9A063;">SARJ WORLDWIDE</strong><br><span style="color:#888;font-size:13px;">Luxury Chauffeur Service</span></p>
      </div>
      <div style="background:#1C1C1E;padding:25px 30px;text-align:center;">
        <p style="color:#C9A063;font-size:14px;font-weight:600;margin:0 0 10px;">SARJ WORLDWIDE</p>
        <p style="color:#888;font-size:12px;margin:0;">231 Oak Park Blvd, Oakville, ON L6H 7S8</p>
        <p style="color:#888;font-size:12px;margin:5px 0 0;"><a href="tel:+14168935779" style="color:#888;">416-893-5779</a> | <span style="color:#888;">reserve@sarjworldwide.ca</span></p>
      </div>
    </div></body></html>`;

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
      subject: `📋 ${bookingId} — ${fullName} — ${vehicle} — ${formattedDateTime}`,
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
      subject: `Booking ${bookingId} — Your Reservation is Confirmed — SARJ WORLDWIDE`,
      html: userEmailHtml,
    });

    // Post to Google Sheet (non-blocking — don't fail if this errors)
    const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
    if (googleScriptUrl) {
      fetch(googleScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "new_reservation",
          bookingId, baseUrl,
          firstName, lastName, email, phone: fullPhone,
          serviceType, vehicle, passengers, childSeatCount, childSeatType, etr407,
          serviceDate, serviceTime, pickupLocation, dropoffLocation,
          stops: stops || [],
          routeDistance, routeDuration, routePrice,
          stopCharge, childSeatCharge, subtotal, hst, gratuity, total,
          airlineName, flightNumber, flightNote, specialRequirements,
        }),
      }).catch((err) => console.error("Google Sheet webhook error:", err));
    }

    return NextResponse.json({ success: true, message: "Reservation submitted successfully!", bookingId });
  } catch (error: any) {
    console.error("Reservation email error:", error);
    let errorMessage = "Failed to send reservation. Please try again later.";
    if (error.code === "EAUTH") errorMessage = "Email authentication failed.";
    else if (error.code === "ECONNECTION" || error.code === "ESOCKET") errorMessage = "Could not connect to email server.";
    return NextResponse.json({ error: errorMessage, details: error.message }, { status: 500 });
  }
}
