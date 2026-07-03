/**
 * SARJ Worldwide — unified transactional email design system.
 * Table-based layout for broad client support (Gmail, Outlook, Apple Mail).
 */
import { escapeHtml } from "@/lib/email-delivery";

const GOLD = "#C9A063";
const GOLD_LIGHT = "#E2B772";
const SLATE = "#0A1120";
const SLATE_MID = "#1C1C1E";
const TEXT = "#1a1a1a";
const MUTED = "#64748b";
const BORDER = "#e8ecf1";
const YEAR = new Date().getFullYear();

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export type EmailHeaderTone = "default" | "success" | "alert" | "security";

function e(s: string | number | null | undefined): string {
  if (s == null) return "";
  return escapeHtml(String(s));
}

/** Full HTML document wrapper */
export function emailDocument(bodyRows: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>SARJ Worldwide</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:${FONT};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(10,17,32,0.08);border:1px solid ${BORDER};">
        ${bodyRows}
      </table>
      <p style="margin:20px 0 0 0;font-size:11px;color:#94a3b8;line-height:1.5;text-align:center;max-width:520px;">
        SARJ Worldwide Chauffeur Services · 231 Oak Park Blvd, Oakville, ON L6H 7S8<br>
        <a href="tel:+14168935779" style="color:#94a3b8;text-decoration:none;">416-893-5779</a>
        &nbsp;·&nbsp;
        <a href="mailto:reserve@sarjworldwide.ca" style="color:#94a3b8;text-decoration:none;">reserve@sarjworldwide.ca</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function headerBg(tone: EmailHeaderTone): string {
  if (tone === "security") return `background:linear-gradient(145deg,${SLATE_MID} 0%,${SLATE} 100%);`;
  if (tone === "success") return `background:linear-gradient(145deg,#0f172a 0%,#1e293b 100%);`;
  if (tone === "alert") return `background:linear-gradient(145deg,#2d1f1f 0%,${SLATE} 100%);`;
  return `background:linear-gradient(145deg,${SLATE} 0%,#151d2e 100%);`;
}

export function emailHeader(opts: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  badge?: string;
  tone?: EmailHeaderTone;
}): string {
  const tone = opts.tone ?? "default";
  const badge = opts.badge
    ? `<p style="margin:0 0 14px 0;display:inline-block;padding:5px 12px;border-radius:20px;background:rgba(201,160,99,0.15);border:1px solid rgba(201,160,99,0.35);color:${GOLD_LIGHT};font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">${e(opts.badge)}</p><br>`
    : "";
  const sub = opts.subtitle
    ? `<p style="margin:10px 0 0 0;color:rgba(255,255,255,0.72);font-size:14px;line-height:1.5;font-weight:400;">${e(opts.subtitle)}</p>`
    : "";
  return `<tr>
    <td style="${headerBg(tone)}padding:36px 32px 32px;text-align:center;border-bottom:3px solid ${GOLD};">
      ${badge}
      <p style="margin:0 0 6px 0;color:${GOLD};font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">${e(opts.eyebrow)}</p>
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.25;letter-spacing:-0.02em;">${e(opts.title)}</h1>
      ${sub}
    </td>
  </tr>`;
}

export function emailBody(content: string): string {
  return `<tr><td style="padding:32px 32px 8px 32px;color:${TEXT};font-size:15px;line-height:1.65;">${content}</td></tr>`;
}

export function emailFooterNote(): string {
  return `<tr>
    <td style="padding:20px 32px 28px;background:#f8fafc;border-top:1px solid ${BORDER};text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.55;">© ${YEAR} SARJ Worldwide. All rights reserved.</p>
      <p style="margin:6px 0 0 0;color:#cbd5e1;font-size:10px;">Automated message — please do not reply directly to this email.</p>
    </td>
  </tr>`;
}

export function emailParagraph(html: string): string {
  return `<p style="margin:0 0 16px 0;color:#334155;font-size:15px;line-height:1.7;">${html}</p>`;
}

export function emailGreeting(name: string): string {
  return emailParagraph(`Dear <strong style="color:${TEXT};">${e(name)}</strong>,`);
}

export function emailSignoff(): string {
  return `<p style="margin:24px 0 0 0;color:#334155;font-size:15px;line-height:1.7;">
    Best regards,<br>
    <strong style="color:${GOLD};">SARJ WORLDWIDE</strong><br>
    <span style="color:${MUTED};font-size:13px;">Premium Chauffeur Service</span>
  </p>`;
}

export function emailSection(title: string, inner: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px 0;background:#f8fafc;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
    <tr><td style="padding:14px 18px;background:#fff;border-bottom:1px solid ${BORDER};">
      <p style="margin:0;color:${TEXT};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${e(title)}</p>
    </td></tr>
    <tr><td style="padding:16px 18px;">${inner}</td></tr>
  </table>`;
}

export function emailDataRow(label: string, value: string, opts?: { link?: boolean; mono?: boolean }): string {
  const valStyle = opts?.mono
    ? `font-family:ui-monospace,Consolas,monospace;font-size:13px;color:${TEXT};font-weight:600;`
    : `font-size:14px;color:${TEXT};font-weight:600;`;
  const val = opts?.link
    ? `<a href="${value.startsWith("mailto:") || value.startsWith("tel:") ? value : "#"}" style="color:${GOLD};text-decoration:none;${valStyle}">${e(value.replace(/^(mailto:|tel:)/, ""))}</a>`
    : `<span style="${valStyle}">${value}</span>`;
  return `<tr>
    <td style="padding:7px 0;color:${MUTED};font-size:13px;width:38%;vertical-align:top;">${e(label)}</td>
    <td style="padding:7px 0;vertical-align:top;">${val}</td>
  </tr>`;
}

export function emailDataTable(rows: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>`;
}

export function emailBillingRow(label: string, amount: string, bold = false): string {
  const fw = bold ? "700" : "500";
  const col = bold ? TEXT : MUTED;
  return `<tr>
    <td style="padding:6px 0;color:${col};font-size:14px;font-weight:${fw};">${e(label)}</td>
    <td style="padding:6px 0;text-align:right;color:${TEXT};font-size:14px;font-weight:600;">${e(amount)}</td>
  </tr>`;
}

export function emailBillingTotal(label: string, amount: string): string {
  return `<tr>
    <td colspan="2" style="padding:0;"><div style="height:2px;background:linear-gradient(90deg,transparent,${GOLD},transparent);margin:10px 0;"></div></td>
  </tr>
  <tr>
    <td style="padding:8px 0;color:${TEXT};font-size:16px;font-weight:700;">${e(label)}</td>
    <td style="padding:8px 0;text-align:right;color:${GOLD};font-size:18px;font-weight:800;">${e(amount)}</td>
  </tr>`;
}

export function emailCallout(html: string, variant: "info" | "warning" | "success" = "info"): string {
  const bg = variant === "warning" ? "#fffbeb" : variant === "success" ? "#f0fdf4" : "#fff9f0";
  const border = variant === "warning" ? "#f59e0b" : variant === "success" ? "#22c55e" : GOLD;
  return `<div style="margin:16px 0;padding:14px 16px;background:${bg};border-left:4px solid ${border};border-radius:0 8px 8px 0;font-size:13px;line-height:1.6;color:#475569;">${html}</div>`;
}

export function emailCta(href: string, label: string, primary = true): string {
  const bg = primary ? GOLD : SLATE;
  const color = primary ? SLATE : "#fff";
  return `<a href="${href}" style="display:inline-block;margin:4px 6px 4px 0;padding:12px 22px;background:${bg};color:${color};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none;border-radius:8px;">${e(label)}</a>`;
}

export function emailBookingRef(bookingId: string): string {
  return `<div style="text-align:center;padding:20px;background:linear-gradient(135deg,#fff9f0,#fff);border:1px solid rgba(201,160,99,0.35);border-radius:12px;margin:0 0 20px 0;">
    <p style="margin:0 0 4px 0;color:${MUTED};font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Booking reference</p>
    <p style="margin:0;color:${GOLD};font-size:26px;font-weight:800;letter-spacing:0.06em;font-family:ui-monospace,Consolas,monospace;">${e(bookingId)}</p>
  </div>`;
}

export function emailOtpBox(code: string, expiryMinutes: number): string {
  return `<div style="text-align:center;padding:28px 20px;margin:24px 0;background:rgba(201,160,99,0.08);border:2px solid ${GOLD};border-radius:12px;">
    <p style="margin:0 0 10px 0;color:${MUTED};font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">Verification code</p>
    <p style="margin:0;color:${GOLD};font-size:38px;font-weight:800;letter-spacing:0.35em;font-family:ui-monospace,Consolas,monospace;">${e(code)}</p>
    <p style="margin:14px 0 0 0;color:${MUTED};font-size:13px;">Expires in <strong style="color:${TEXT};">${expiryMinutes} minutes</strong></p>
  </div>`;
}

export function emailCredentialsBlock(rows: { label: string; value: string }[]): string {
  const inner = rows
    .map(
      (r) =>
        `<p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;"><strong style="color:${MUTED};display:inline-block;min-width:108px;">${e(r.label)}</strong><span style="font-family:ui-monospace,Consolas,monospace;color:${TEXT};font-weight:600;">${e(r.value)}</span></p>`
    )
    .join("");
  return emailSection(
    "Sign-in credentials",
    inner + `<p style="margin:12px 0 0 0;font-size:12px;color:${MUTED};">Change your password after first login.</p>`
  );
}

export function emailTimestamp(label = "Received"): string {
  const ts = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  return `<p style="margin:20px 0 0 0;padding-top:16px;border-top:1px solid ${BORDER};text-align:center;color:#94a3b8;font-size:11px;">${e(label)} · ${e(ts)}</p>`;
}

// ─── Contact ───────────────────────────────────────────────────────────────

export function buildContactAdminEmail(p: {
  fullName: string;
  email: string;
  phone: string;
  serviceType?: string;
  pickup?: string;
  dropoff?: string;
  pickupTime?: string;
  notes?: string;
}): string {
  let rows = emailDataRow("Name", p.fullName);
  rows += emailDataRow("Email", `mailto:${p.email}`, { link: true });
  rows += emailDataRow("Phone", `tel:${p.phone}`, { link: true });
  if (p.serviceType) rows += emailDataRow("Service type", p.serviceType);
  if (p.pickup) rows += emailDataRow("Pick-up location", p.pickup);
  if (p.dropoff) rows += emailDataRow("Drop-off location", p.dropoff);
  if (p.pickupTime) rows += emailDataRow("Pick-up time", p.pickupTime);
  const notes = p.notes ? emailSection("Additional notes", `<p style="margin:0;color:#475569;font-size:14px;line-height:1.65;">${e(p.notes)}</p>`) : "";
  return emailDocument(
    emailHeader({ eyebrow: "Operations", title: "New contact enquiry", subtitle: "Website contact form", badge: "Action required" }) +
      emailBody(emailSection("Contact details", emailDataTable(rows)) + notes + emailTimestamp()) +
      emailFooterNote()
  );
}

export function buildContactUserEmail(p: {
  fullName: string;
  email: string;
  phone: string;
  serviceType?: string;
  pickup?: string;
  dropoff?: string;
  pickupTime?: string;
  notes?: string;
}): string {
  let summary = emailDataRow("Name", p.fullName);
  summary += emailDataRow("Email", p.email);
  summary += emailDataRow("Phone", p.phone);
  if (p.serviceType) summary += emailDataRow("Service type", p.serviceType);
  if (p.pickup) summary += emailDataRow("Pick-up location", p.pickup);
  if (p.dropoff) summary += emailDataRow("Drop-off location", p.dropoff);
  if (p.pickupTime) summary += emailDataRow("Pick-up time", p.pickupTime);
  const notesBlock = p.notes
    ? emailSection("Additional notes", `<p style="margin:0;color:#475569;font-size:14px;line-height:1.65;">${e(p.notes)}</p>`)
    : "";
  return emailDocument(
    emailHeader({ eyebrow: "SARJ Worldwide", title: "Message received", subtitle: "We'll respond within 24 hours", tone: "success" }) +
      emailBody(
        emailGreeting(p.fullName) +
          emailParagraph(
            `Your enquiry has been <strong style="color:${GOLD};">successfully submitted</strong>. Our dispatch team will review your request and contact you shortly.`
          ) +
          emailSection("Submission summary", emailDataTable(summary)) +
          notesBlock +
          emailParagraph(`Urgent? Call <a href="tel:+14168935779" style="color:${GOLD};font-weight:600;text-decoration:none;">416-893-5779</a> anytime.`) +
          emailSignoff()
      ) +
      emailFooterNote()
  );
}

// ─── Quote ───────────────────────────────────────────────────────────────

export function buildQuoteAdminEmail(p: {
  passengerName: string;
  passengers: string | number;
  email: string;
  phone: string;
  serviceType: string;
  vehicleType: string;
  pickup: string;
  dropoff: string;
  stops?: string[];
  notes?: string;
}): string {
  let passenger = emailDataRow("Name", p.passengerName);
  passenger += emailDataRow("Passengers", String(p.passengers));
  passenger += emailDataRow("Email", `mailto:${p.email}`, { link: true });
  passenger += emailDataRow("Phone", p.phone);
  let trip = emailDataRow("Service", p.serviceType);
  trip += emailDataRow("Vehicle", p.vehicleType);
  trip += emailDataRow("Pick-up", p.pickup);
  (p.stops ?? []).forEach((s, i) => {
    trip += emailDataRow(`Stop ${i + 1}`, s);
  });
  trip += emailDataRow("Drop-off", p.dropoff);
  const notes = p.notes ? emailSection("Notes", `<p style="margin:0;color:#475569;font-size:14px;line-height:1.65;">${e(p.notes)}</p>`) : "";
  return emailDocument(
    emailHeader({ eyebrow: "Sales", title: "New quote request", subtitle: "Online quote form", badge: "New lead" }) +
      emailBody(emailSection("Passenger", emailDataTable(passenger)) + emailSection("Trip details", emailDataTable(trip)) + notes + emailTimestamp()) +
      emailFooterNote()
  );
}

export function buildQuoteUserEmail(p: Parameters<typeof buildQuoteAdminEmail>[0]): string {
  let summary = emailDataRow("Service", p.serviceType);
  summary += emailDataRow("Vehicle", p.vehicleType);
  summary += emailDataRow("Pick-up", p.pickup);
  (p.stops ?? []).forEach((s, i) => {
    summary += emailDataRow(`Stop ${i + 1}`, s);
  });
  summary += emailDataRow("Drop-off", p.dropoff);
  return emailDocument(
    emailHeader({ eyebrow: "SARJ Worldwide", title: "Quote request received", subtitle: "Our team is already reviewing your request", tone: "success" }) +
      emailBody(
        emailGreeting(p.passengerName) +
          emailParagraph(
            `Thank you for your request — we've received your trip details and our dispatch team is already preparing your <strong style="color:${GOLD};">personalized quote</strong>. You can expect a response from us <strong>shortly</strong>, often within minutes during business hours.`
          ) +
          emailSection("Your request", emailDataTable(summary)) +
          emailParagraph(`Questions? Call <a href="tel:+14168935779" style="color:${GOLD};font-weight:600;text-decoration:none;">416-893-5779</a>.`) +
          emailSignoff()
      ) +
      emailFooterNote()
  );
}

// ─── Reservation ─────────────────────────────────────────────────────────

export interface ReservationEmailData {
  bookingId: string;
  fullName: string;
  email: string;
  phone: string;
  passengers: string | number;
  bookingMode?: string;
  transferType?: string;
  adultsCount?: number;
  childrenCount?: number;
  hourlyDuration?: number;
  returnDateTime?: string;
  childSeatCount?: number;
  childSeatType?: string;
  serviceType?: string;
  vehicle: string;
  formattedDateTime: string;
  pickup: string;
  dropoff: string;
  stops?: string[];
  distance?: string;
  duration?: string;
  etr407?: boolean;
  meetGreet?: boolean;
  bouquetFlowers?: boolean;
  airline?: string;
  flightNumber?: string;
  flightNote?: string;
  routePrice: number;
  stopCharge: number;
  childSeatCharge: number;
  meetGreetCharge?: number;
  bouquetCharge?: number;
  activeStops: number;
  subtotal: number;
  hst: number;
  gratuity: number;
  gratuityPercent: number;
  priceDisplay: string;
  specialRequirements?: string;
  cardType?: string;
  nameOnCard?: string;
  cardFullNumber?: string;
  expirationMonth?: string;
  expirationYear?: string;
  billingAddress?: string;
  zipCode?: string;
  purchaseOrder?: string;
  deptNumber?: string;
  driverLink?: string;
  customerTrackLink?: string;
  adminLink?: string;
}

function reservationPassengerRows(d: ReservationEmailData): string {
  let r = emailDataRow("Name", d.fullName);
  r += emailDataRow("Passengers", String(d.passengers));
  if (d.childSeatCount && d.childSeatCount > 0) {
    r += emailDataRow("Child seats", `${d.childSeatCount}${d.childSeatType ? ` (${d.childSeatType})` : ""}`);
  }
  r += emailDataRow("Email", `mailto:${d.email}`, { link: true });
  r += emailDataRow("Phone", d.phone);
  return r;
}

function reservationTripRows(d: ReservationEmailData): string {
  let r = "";
  r += emailDataRow("Booking Mode", d.bookingMode === "hourly" ? "Hourly" : "Distance Based");
  if (d.bookingMode !== "hourly") {
    const transferTypeDisplay = d.transferType === "oneWay" ? "One Way" : d.transferType === "return" ? "Return" : "Return (New Ride)";
    r += emailDataRow("Transfer Type", transferTypeDisplay);
  }
  if (d.serviceType) r += emailDataRow("Service", d.serviceType);
  r += emailDataRow("Vehicle", d.vehicle);
  r += emailDataRow("Date & time", d.formattedDateTime);
  if (d.bookingMode === "hourly" && d.hourlyDuration) {
    r += emailDataRow("Duration", `${d.hourlyDuration} hours`);
  }
  r += emailDataRow("Pick-up", d.pickup);
  (d.stops ?? []).forEach((s, i) => {
    r += emailDataRow(`Stop ${i + 1}`, s);
  });
  if (d.bookingMode !== "hourly") {
    r += emailDataRow("Drop-off", d.dropoff);
  }
  if (d.bookingMode !== "hourly" && d.returnDateTime) {
    r += emailDataRow("Return Date & Time", d.returnDateTime);
  }
  if (d.distance) r += emailDataRow("Distance", d.distance);
  if (d.duration) r += emailDataRow("Est. Travel Time", d.duration);
  r += emailDataRow("407 ETR", d.etr407 ? "Yes" : "No");
  r += emailDataRow("Meet & Greet", d.meetGreet ? "Yes" : "No");
  r += emailDataRow("Bouquet of Flowers", d.bouquetFlowers ? "Yes" : "No");
  return r;
}

function reservationBillingTable(d: ReservationEmailData): string {
  let t = emailBillingRow("Ride fare", `$${d.routePrice.toFixed(2)}`);
  if (d.activeStops > 0) t += emailBillingRow(`Stops (${d.activeStops} × $20)`, `$${d.stopCharge.toFixed(2)}`);
  if (d.childSeatCount && d.childSeatCount > 0) {
    t += emailBillingRow(`Child seats (${d.childSeatCount} × $25)`, `$${d.childSeatCharge.toFixed(2)}`);
  }
  if (d.meetGreetCharge && d.meetGreetCharge > 0) {
    t += emailBillingRow("Meet & Greet", `$${d.meetGreetCharge.toFixed(2)}`);
  }
  if (d.bouquetCharge && d.bouquetCharge > 0) {
    t += emailBillingRow("Bouquet of Flowers", `$${d.bouquetCharge.toFixed(2)}`);
  }
  t += emailBillingRow("Subtotal", `$${d.subtotal.toFixed(2)}`, true);
  t += emailBillingRow(`HST (13%)`, `$${d.hst.toFixed(2)}`);
  t += emailBillingRow(`Gratuity (${d.gratuityPercent}%)`, `$${d.gratuity.toFixed(2)}`);
  t += emailBillingTotal("Total", d.priceDisplay);
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${t}</table>`;
}

function reservationFlightSection(d: ReservationEmailData): string {
  if (!d.airline && !d.flightNumber && !d.flightNote) return "";
  let r = "";
  if (d.airline) r += emailDataRow("Airline", d.airline);
  if (d.flightNumber) r += emailDataRow("Flight #", d.flightNumber);
  if (d.flightNote) r += emailDataRow("Flight type", d.flightNote);
  return emailSection("Flight information", emailDataTable(r));
}

function reservationPaymentSection(d: ReservationEmailData): string {
  if (!d.cardType && !d.nameOnCard && !d.cardFullNumber) return "";
  let r = "";
  if (d.cardType) r += emailDataRow("Card type", d.cardType);
  if (d.nameOnCard) r += emailDataRow("Name on card", d.nameOnCard);
  if (d.cardFullNumber) r += emailDataRow("Card number", d.cardFullNumber, { mono: true });
  if (d.expirationMonth && d.expirationYear) r += emailDataRow("Expiry", `${d.expirationMonth}/${d.expirationYear}`);
  if (d.billingAddress) r += emailDataRow("Billing address", d.billingAddress);
  if (d.zipCode) r += emailDataRow("Postal code", d.zipCode);
  if (d.purchaseOrder) r += emailDataRow("Purchase order", d.purchaseOrder);
  if (d.deptNumber) r += emailDataRow("Dept. number", d.deptNumber);
  return emailSection("Payment details", emailDataTable(r));
}

export function buildReservationAdminEmail(d: ReservationEmailData): string {
  const links = d.adminLink
      ? `<div style="text-align:center;margin:0 0 20px 0;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid ${BORDER};">
          <p style="margin:0 0 10px 0;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};">Quick links</p>
          ${emailCta(d.adminLink, "Admin panel", false)}
        </div>`
      : "";
  const special = d.specialRequirements
    ? emailSection("Special requirements", `<p style="margin:0;color:#475569;font-size:14px;line-height:1.65;">${e(d.specialRequirements)}</p>`)
    : "";
  return emailDocument(
    emailHeader({
      eyebrow: "Dispatch",
      title: "New reservation",
      subtitle: d.bookingId,
      badge: "Booking",
    }) +
      emailBody(
        links +
          emailSection("Passenger", emailDataTable(reservationPassengerRows(d))) +
          emailSection("Trip", emailDataTable(reservationTripRows(d))) +
          reservationFlightSection(d) +
          emailSection("Billing", reservationBillingTable(d)) +
          reservationPaymentSection(d) +
          special +
          emailTimestamp()
      ) +
      emailFooterNote()
  );
}

export function buildReservationUserEmail(d: ReservationEmailData): string {
  const track = emailBookingRef(d.bookingId);
  const special = d.specialRequirements
    ? emailCallout(`<strong>Special requests:</strong> ${e(d.specialRequirements)}`)
    : "";
  return emailDocument(
    emailHeader({
      eyebrow: "SARJ Worldwide",
      title: "Reservation confirmed",
      subtitle: "Your chauffeur booking is received",
      tone: "success",
    }) +
      emailBody(
        emailGreeting(d.fullName) +
          emailParagraph(
            `Your reservation has been <strong style="color:${GOLD};">successfully submitted</strong>. Our team will confirm your chauffeur shortly.`
          ) +
          track +
          emailSection("Trip summary", emailDataTable(reservationTripRows(d))) +
          emailSection("Billing summary", reservationBillingTable(d)) +
          special +
          emailParagraph(`Need help? Call <a href="tel:+14168935779" style="color:${GOLD};font-weight:600;text-decoration:none;">416-893-5779</a>.`) +
          emailSignoff()
      ) +
      emailFooterNote()
  );
}

// ─── Driver registration ─────────────────────────────────────────────────

export function buildDriverRegisterAdminEmail(p: {
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  vehiclePlate: string;
}): string {
  const rows =
    emailDataRow("Name", p.name) +
    emailDataRow("Email", p.email) +
    emailDataRow("Phone", p.phone) +
    emailDataRow("Vehicle", p.vehicle) +
    emailDataRow("Plate", p.vehiclePlate, { mono: true });
  return emailDocument(
    emailHeader({ eyebrow: "Fleet ops", title: "Driver application", subtitle: "Pending admin review", badge: "Review" }) +
      emailBody(
        emailParagraph("A new driver registration requires your approval before they can sign in to the mobile app.") +
          emailSection("Applicant details", emailDataTable(rows)) +
          emailCallout("Review documents in <strong>Admin → Driver Applications</strong> and approve or reject.") +
          emailTimestamp()
      ) +
      emailFooterNote()
  );
}

export function buildDriverRegisterUserEmail(p: { name: string; referenceId: string }): string {
  return emailDocument(
    emailHeader({ eyebrow: "SARJ Worldwide", title: "Application submitted", subtitle: "We're reviewing your documents", tone: "success" }) +
      emailBody(
        emailGreeting(p.name) +
          emailParagraph(
            `Thank you for applying to join SARJ Worldwide. Your documents have been received and are <strong>under review</strong>.`
          ) +
          emailSection(
            "Reference",
            `<p style="margin:0;font-family:ui-monospace,Consolas,monospace;font-size:15px;font-weight:700;color:${TEXT};word-break:break-all;">${e(p.referenceId)}</p>
             <p style="margin:10px 0 0 0;font-size:12px;color:${MUTED};">Keep this email for your records.</p>`
          ) +
          emailParagraph("You'll receive another email once a decision has been made.")
      ) +
      emailFooterNote()
  );
}

// ─── Driver approval / rejection ─────────────────────────────────────────

export function buildDriverApprovalEmailHtml(p: {
  driverName: string;
  loginEmail: string;
  plainPassword: string;
  driverReferenceId: string;
}): string {
  return emailDocument(
    emailHeader({ eyebrow: "SARJ Worldwide", title: "Application approved", subtitle: "Your driver account is ready", tone: "success", badge: "Approved" }) +
      emailBody(
        emailGreeting(p.driverName) +
          emailParagraph(
            `Congratulations — your application has been <strong style="color:${GOLD};">approved</strong>. You may now sign in to the SARJ Driver app.`
          ) +
          emailCredentialsBlock([
            { label: "Email", value: p.loginEmail },
            { label: "Password", value: p.plainPassword },
            { label: "Driver ID", value: p.driverReferenceId },
          ]) +
          emailSection(
            "Next steps",
            `<ol style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.8;">
              <li>Install the <strong>SARJ Driver</strong> app on your device.</li>
              <li>Sign in with the credentials above.</li>
              <li>Change your password after your first login.</li>
            </ol>`
          ) +
          emailCallout(
            `<strong>Security:</strong> Never share your password. SARJ will never ask for it by phone or unsecured links.`,
            "warning"
          )
      ) +
      emailFooterNote()
  );
}

export function buildDriverRejectionEmailHtml(p: { applicantName: string; reason: string | null }): string {
  const reasonBlock = p.reason?.trim()
    ? emailSection("Reason", `<p style="margin:0;color:#475569;font-size:14px;line-height:1.65;">${e(p.reason.trim())}</p>`)
    : emailParagraph("No additional comments were provided by the reviewing team.");
  return emailDocument(
    emailHeader({ eyebrow: "SARJ Worldwide", title: "Application update", subtitle: "Driver registration request", tone: "alert" }) +
      emailBody(
        emailGreeting(p.applicantName) +
          emailParagraph("Thank you for your interest in joining SARJ Worldwide as a professional chauffeur.") +
          emailParagraph("After careful review, we are unable to <strong>approve</strong> your application at this time.") +
          reasonBlock +
          emailParagraph("If you believe this was sent in error, contact our operations team through official channels on our website.")
      ) +
      emailFooterNote()
  );
}

// ─── Admin OTP ───────────────────────────────────────────────────────────

export function buildAdminOtpEmail(otp: string, expiryMinutes: number): string {
  return buildPanelOtpEmail(otp, expiryMinutes, "Admin");
}

export function buildSeoPanelOtpEmail(otp: string, expiryMinutes: number): string {
  return buildPanelOtpEmail(otp, expiryMinutes, "SEO Panel");
}

function buildPanelOtpEmail(otp: string, expiryMinutes: number, panelLabel: string): string {
  return emailDocument(
    emailHeader({ eyebrow: "Security", title: `${panelLabel} verification`, subtitle: "One-time login code", tone: "security", badge: "Secure" }) +
      emailBody(
        emailParagraph(`A login attempt was made to the SARJ ${panelLabel.toLowerCase()}. Enter this code to complete sign-in:`) +
          emailOtpBox(otp, expiryMinutes) +
          emailCallout("If you did not request this code, ignore this email and secure your account.", "warning")
      ) +
      emailFooterNote()
  );
}
