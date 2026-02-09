import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { passengerName, passengers, phone, phoneCode, email, serviceType, vehicle, pickupTime, pickupLocation, stops, dropoffLocation, additionalNotes } = await request.json();

    if (!passengerName || !passengers || !phone || !email || !serviceType || !vehicle || !pickupTime || !pickupLocation || !dropoffLocation) {
      return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
    }

    const fullPhone = `${phoneCode}${phone}`;
    const currentDate = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
    const formattedPickupTime = new Date(pickupTime).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });

    const stopsRows = stops && stops.length > 0
      ? stops.map((s: string, i: number) => `<tr><td style="padding:10px 0;color:#666;font-size:14px;">Stop ${i+1}:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${s}</td></tr>`).join("")
      : "";

    const stopsUser = stops && stops.length > 0
      ? stops.map((s: string, i: number) => `<p style="color:#666;font-size:14px;margin:5px 0;"><strong>Stop ${i+1}:</strong> ${s}</p>`).join("")
      : "";

    const adminEmailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:linear-gradient(135deg,#C9A063,#A68B5B);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">New Online Quote Request</h1>
        <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:14px;">SARJ Worldwide Chauffeur Service</p>
      </div>
      <div style="padding:30px;">
        <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h2 style="color:#1C1C1E;margin:0 0 15px;font-size:18px;border-bottom:2px solid #C9A063;padding-bottom:10px;">Passenger Details</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:10px 0;color:#666;font-size:14px;width:140px;">Name:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${passengerName}</td></tr>
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">Passengers:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${passengers}</td></tr>
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">Email:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;"><a href="mailto:${email}" style="color:#C9A063;">${email}</a></td></tr>
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">Phone:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;"><a href="tel:${fullPhone}" style="color:#C9A063;">${fullPhone}</a></td></tr>
          </table>
        </div>
        <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h2 style="color:#1C1C1E;margin:0 0 15px;font-size:18px;border-bottom:2px solid #C9A063;padding-bottom:10px;">Trip Details</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:10px 0;color:#666;font-size:14px;width:140px;">Service:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${serviceType}</td></tr>
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">Vehicle:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${vehicle}</td></tr>
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">Pick-up Time:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${formattedPickupTime}</td></tr>
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">Pick-up:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${pickupLocation}</td></tr>
            ${stopsRows}
            <tr><td style="padding:10px 0;color:#666;font-size:14px;">Drop-off:</td><td style="padding:10px 0;color:#1C1C1E;font-size:14px;font-weight:600;">${dropoffLocation}</td></tr>
          </table>
        </div>
        ${additionalNotes ? `<div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:20px;"><h3 style="color:#1C1C1E;margin:0 0 10px;font-size:16px;">Additional Notes:</h3><p style="color:#444;font-size:14px;line-height:1.6;margin:0;">${additionalNotes}</p></div>` : ""}
        <div style="text-align:center;padding:20px 0;border-top:1px solid #eee;"><p style="color:#888;font-size:12px;margin:0;">Received on ${currentDate}</p></div>
      </div>
    </div></body></html>`;

    const userEmailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:linear-gradient(135deg,#C9A063,#A68B5B);padding:40px 30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">Thank You!</h1>
        <p style="color:rgba(255,255,255,0.9);margin:15px 0 0;font-size:16px;">Your Online Quote has been received</p>
      </div>
      <div style="padding:40px 30px;">
        <p style="color:#1C1C1E;font-size:16px;line-height:1.8;margin:0 0 20px;">Dear <strong>${passengerName}</strong>,</p>
        <p style="color:#444;font-size:15px;line-height:1.8;margin:0 0 20px;">Your Online Quote Form has been <strong style="color:#C9A063;">successfully submitted</strong> to SARJ WORLDWIDE. Our team will review your request and get back to you with a personalized quote within 24 hours.</p>
        <div style="background:linear-gradient(135deg,#f8f9fa,#fff);border-radius:12px;padding:25px;margin:25px 0;border-left:4px solid #C9A063;">
          <h3 style="color:#1C1C1E;margin:0 0 15px;font-size:16px;">Your Quote Summary:</h3>
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>Name:</strong> ${passengerName}</p>
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>Passengers:</strong> ${passengers}</p>
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>Service:</strong> ${serviceType}</p>
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>Vehicle:</strong> ${vehicle}</p>
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>Pick-up Time:</strong> ${formattedPickupTime}</p>
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>Pick-up:</strong> ${pickupLocation}</p>
          ${stopsUser}
          <p style="color:#666;font-size:14px;margin:5px 0;"><strong>Drop-off:</strong> ${dropoffLocation}</p>
        </div>
        <p style="color:#444;font-size:15px;line-height:1.8;margin:20px 0;">For urgent inquiries, call us at <a href="tel:+14168935779" style="color:#C9A063;font-weight:600;">416-893-5779</a>.</p>
        <p style="color:#444;font-size:15px;line-height:1.8;margin:20px 0 0;">Best regards,<br><strong style="color:#C9A063;">SARJ WORLDWIDE</strong><br><span style="color:#888;font-size:13px;">Luxury Chauffeur Service</span></p>
      </div>
      <div style="background:#1C1C1E;padding:25px 30px;text-align:center;">
        <p style="color:#C9A063;font-size:14px;font-weight:600;margin:0 0 10px;">SARJ WORLDWIDE</p>
        <p style="color:#888;font-size:12px;margin:0;">231 Oak Park Blvd, Oakville, ON L6H 7S8</p>
        <p style="color:#888;font-size:12px;margin:5px 0 0;"><a href="tel:+14168935779" style="color:#888;">416-893-5779</a> | <a href="mailto:reserve@sarjworldwide.ca" style="color:#888;">reserve@sarjworldwide.ca</a></p>
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

    await transporter.sendMail({
      from: `"SARJ Website" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL,
      subject: `New Online Quote: ${passengerName} - ${serviceType}`,
      html: adminEmailHtml,
    });

    await transporter.sendMail({
      from: `"SARJ WORLDWIDE" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Online Quote Form is Successfully Submitted - SARJ WORLDWIDE",
      html: userEmailHtml,
    });

    return NextResponse.json({ success: true, message: "Your quote request has been sent successfully!" });
  } catch (error: any) {
    console.error("Quote email error:", error);
    let errorMessage = "Failed to send quote. Please try again later.";
    if (error.code === "EAUTH") errorMessage = "Email authentication failed.";
    else if (error.code === "ECONNECTION" || error.code === "ESOCKET") errorMessage = "Could not connect to email server.";
    return NextResponse.json({ error: errorMessage, details: error.message }, { status: 500 });
  }
}
