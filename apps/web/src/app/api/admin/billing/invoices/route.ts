import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireBillingAdmin } from "@/lib/admin-rbac";
import {
  duplicateInvoiceAsDraft,
  issueManualInvoiceForReservation,
  issueStandaloneInvoice,
  processInvoiceJobs,
  resendInvoiceEmail,
  retryInvoiceJob,
  saveStandaloneDraft,
} from "@/lib/invoice-engine";
import type { InvoiceFareSnapshot } from "@/lib/invoice-types";
import {
  createManualInvoicePaymentIntent,
  createManualInvoicePaymentLink,
  markManualInvoicePaidAndDeliver,
} from "@/lib/manual-invoice-payment";
import type { InvoiceJobType } from "@/lib/invoice-types";
import {
  AIRPORT_PICKUP_FEE,
  BOUQUET_CHARGE,
  MEET_GREET_CHARGE,
} from "@/lib/reservation-pricing";
import { humanSpecialRequirements } from "@/lib/special-requirements";

/** GET — list invoices for Billing panel (assistant-safe fields only). */
export async function GET(req: NextRequest) {
  const gate = await requireBillingAdmin(req);
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const sync = (url.searchParams.get("sync") || "").trim().toUpperCase();
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take") || 50)));

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { bookingId: { contains: q, mode: "insensitive" } },
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
    ];
  }
  if (sync === "FAILED") {
    where.OR = [
      { emailStatus: "FAILED" },
      { qbSyncStatus: "FAILED" },
      { dropboxSyncStatus: "FAILED" },
    ];
  }

  const [invoices, failedCount] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        invoiceNumber: true,
        kind: true,
        status: true,
        bookingId: true,
        source: true,
        reservationId: true,
        customerName: true,
        customerEmail: true,
        total: true,
        currency: true,
        emailStatus: true,
        qbSyncStatus: true,
        dropboxSyncStatus: true,
        pdfUrl: true,
        emailedAt: true,
        resendCount: true,
        createdAt: true,
        snapshotJson: true,
      },
    }),
    prisma.invoice.count({
      where: {
        OR: [
          { emailStatus: "FAILED" },
          { qbSyncStatus: "FAILED" },
          { dropboxSyncStatus: "FAILED" },
        ],
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    role: gate.auth.role,
    failedCount,
    invoices: invoices.map((i) => {
      const isDraft = String(i.status || "").toUpperCase() === "DRAFT";
      let paid = false;
      let paymentHeld = !isDraft && i.emailStatus === "SKIPPED";
      try {
        const snap = JSON.parse(i.snapshotJson) as {
          paymentStatus?: string;
          paymentMethodLabel?: string;
        };
        const ps = String(snap.paymentStatus || "").toUpperCase();
        paid = ps === "PAID" || ps.includes("PAID");
        const src = String(i.source || "").toUpperCase();
        const card = /^credit\s*card$/i.test(
          String(snap.paymentMethodLabel || "")
        );
        paymentHeld =
          !isDraft &&
          !paid &&
          (i.emailStatus === "SKIPPED" ||
            ((src === "MANUAL" || src === "RESERVATION") && card));
      } catch {
        /* keep defaults */
      }
      const { snapshotJson: _snap, ...rest } = i;
      return {
        ...rest,
        paid,
        paymentHeld,
        isDraft,
        createdAt: i.createdAt.toISOString(),
        emailedAt: i.emailedAt?.toISOString() || null,
      };
    }),
  });
}

function parseStandaloneBody(body: Record<string, unknown>) {
  const linesRaw = Array.isArray(body.lines) ? body.lines : [];
  const lines = linesRaw
    .map((l: { label?: unknown; amount?: unknown }) => ({
      label: String(l?.label || "").trim(),
      amount: Number(l?.amount),
    }))
    .filter((l: { label: string; amount: number }) => l.label && Number.isFinite(l.amount));

  const paymentMethodLabel =
    typeof body.paymentMethodLabel === "string" ? body.paymentMethodLabel.trim() : "";
  const isCardCollect = /^credit\s*card$/i.test(paymentMethodLabel);
  const alreadyPaid = isCardCollect ? false : Boolean(body.alreadyPaid);

  const bookingIdRaw =
    typeof body.bookingId === "string" ? body.bookingId.trim() : "";
  const reservationIdRaw =
    typeof body.reservationId === "string" ? body.reservationId.trim() : "";
  const draftIdRaw =
    typeof body.draftId === "string" ? body.draftId.trim() : "";
  const gratuityRaw =
    body.gratuity === "" || body.gratuity == null ? 0 : Number(body.gratuity);

  return {
    bookingId: bookingIdRaw || undefined,
    reservationId: reservationIdRaw || undefined,
    draftId: draftIdRaw || undefined,
    customerName: String(body.customerName || ""),
    customerEmail: String(body.customerEmail || ""),
    customerPhone: typeof body.customerPhone === "string" ? body.customerPhone : "",
    serviceType: typeof body.serviceType === "string" ? body.serviceType : "",
    vehicle: typeof body.vehicle === "string" ? body.vehicle : "",
    serviceDate: typeof body.serviceDate === "string" ? body.serviceDate : "",
    serviceTime: typeof body.serviceTime === "string" ? body.serviceTime : "",
    pickupLocation: typeof body.pickupLocation === "string" ? body.pickupLocation : "",
    dropoffLocation: typeof body.dropoffLocation === "string" ? body.dropoffLocation : "",
    stops: typeof body.stops === "string" ? body.stops : "",
    passengers:
      body.passengers === "" || body.passengers == null
        ? undefined
        : Number(body.passengers),
    airline: typeof body.airline === "string" ? body.airline : "",
    flightNumber: typeof body.flightNumber === "string" ? body.flightNumber : "",
    flightNote: typeof body.flightNote === "string" ? body.flightNote : "",
    childSeats:
      body.childSeats === "" || body.childSeats == null
        ? undefined
        : Number(body.childSeats),
    childSeatType:
      typeof body.childSeatType === "string" ? body.childSeatType : "",
    etr407: typeof body.etr407 === "string" ? body.etr407 : "",
    distance: typeof body.distance === "string" ? body.distance : "",
    duration: typeof body.duration === "string" ? body.duration : "",
    specialRequirements:
      typeof body.specialRequirements === "string"
        ? body.specialRequirements
        : "",
    paymentMethodLabel,
    alreadyPaid,
    gratuity: Number.isFinite(gratuityRaw) ? Math.max(0, gratuityRaw) : 0,
    lines,
  };
}

function snapshotToFormPayload(
  inv: {
    id: string;
    invoiceNumber: string;
    bookingId: string;
    reservationId: string | null;
    status: string;
    source: string;
    total: number;
  },
  snap: InvoiceFareSnapshot
) {
  const stops = Array.isArray(snap.trip?.stops)
    ? snap.trip.stops.filter(Boolean).join(" | ")
    : "";
  const lines = (snap.lines || [])
    .filter((l) => String(l.key || "").startsWith("line_"))
    .map((l) => ({
      label: String(l.label || "").trim() || "Line",
      amount: Math.round((Number(l.amount) || 0) * 100) / 100,
    }));

  const rawDate = String(snap.trip?.serviceDate || "").trim();
  const serviceDate = /^\d{4}-\d{2}-\d{2}/.test(rawDate)
    ? rawDate.slice(0, 10)
    : rawDate;
  const rawTime = String(snap.trip?.serviceTime || "").trim();
  let serviceTime = rawTime;
  const ampm = rawTime.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const min = ampm[2];
    const ap = ampm[3].toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    serviceTime = `${String(h).padStart(2, "0")}:${min}`;
  } else {
    const m24 = rawTime.match(/^(\d{1,2}):(\d{2})/);
    if (m24) {
      serviceTime = `${m24[1].padStart(2, "0")}:${m24[2]}`;
    }
  }

  let serviceType = String(snap.trip?.serviceType || "").trim();
  if (/parcel/i.test(serviceType)) serviceType = "Parcel Delivery";
  else if (/hourly/i.test(serviceType)) serviceType = "Hourly ride";
  else if (/point|distance/i.test(serviceType) || !serviceType) {
    serviceType = serviceType || "Point-to-Point transportation";
  }

  const email = String(snap.customer?.email || "").trim();
  const placeholder = /@placeholder\.local$/i.test(email);

  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    bookingId: inv.bookingId,
    reservationId: inv.reservationId || snap.reservationId || null,
    status: inv.status,
    source: inv.source,
    isDraft: String(inv.status || "").toUpperCase() === "DRAFT",
    total: inv.total,
    customerName: String(snap.customer?.name || "").trim(),
    customerEmail: placeholder ? "" : email,
    customerPhone: String(snap.customer?.phone || "").trim(),
    serviceType,
    vehicle: String(snap.trip?.vehicle || "").trim(),
    serviceDate,
    serviceTime,
    pickupLocation: String(snap.trip?.pickupLocation || "").trim(),
    dropoffLocation: String(snap.trip?.dropoffLocation || "").trim(),
    stops,
    passengers: String(snap.trip?.passengers ?? 1),
    childSeats: String(snap.trip?.childSeats ?? 0),
    childSeatType: String(snap.trip?.childSeatType || "").trim(),
    etr407: String(snap.trip?.etr407 || "").trim(),
    airline: String(snap.trip?.airline || "").trim(),
    flightNumber: String(snap.trip?.flightNumber || "").trim(),
    flightNote: String(snap.trip?.flightNote || "").trim(),
    distance: String(snap.trip?.distance || "").trim(),
    duration: String(snap.trip?.duration || "").trim(),
    specialRequirements: humanSpecialRequirements(
      String(snap.trip?.specialRequirements || "")
    ),
    paymentMethodLabel: String(snap.paymentMethodLabel || "Credit card").trim() || "Credit card",
    gratuity: Math.round(Math.max(0, Number(snap.gratuity) || 0) * 100) / 100,
    lines: lines.length ? lines : [{ label: "Ride fare", amount: 0 }],
  };
}

/** POST — resend | retry | issue_manual | issue_standalone | process_jobs */
export async function POST(req: NextRequest) {
  const gate = await requireBillingAdmin(req);
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").trim();

  if (action === "resend") {
    const invoiceId = String(body.invoiceId || "");
    const toEmail =
      typeof body.toEmail === "string" ? body.toEmail.trim().toLowerCase() : "";
    const result = await resendInvoiceEmail({
      invoiceId,
      actor: gate.auth.actor,
      adminId: gate.auth.adminId,
      toEmail: toEmail || null,
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "retry") {
    const invoiceId = String(body.invoiceId || "");
    const type = String(body.type || "").toUpperCase() as InvoiceJobType;
    if (!["EMAIL", "QBO_SYNC", "DROPBOX_SYNC"].includes(type)) {
      return NextResponse.json({ success: false, error: "Invalid job type" }, { status: 400 });
    }
    await retryInvoiceJob({
      invoiceId,
      type,
      actor: gate.auth.actor,
      adminId: gate.auth.adminId,
    });
    return NextResponse.json({ success: true });
  }

  if (action === "issue_manual") {
    const reservationId = String(body.reservationId || "");
    const result = await issueManualInvoiceForReservation(reservationId, {
      actor: gate.auth.actor,
      adminId: gate.auth.adminId,
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, ...result });
  }

  if (action === "issue_standalone") {
    const parsed = parseStandaloneBody(body as Record<string, unknown>);
    const result = await issueStandaloneInvoice(parsed, {
      actor: gate.auth.actor,
      adminId: gate.auth.adminId,
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, ...result });
  }

  if (action === "save_draft") {
    const parsed = parseStandaloneBody(body as Record<string, unknown>);
    const result = await saveStandaloneDraft(parsed, {
      actor: gate.auth.actor,
      adminId: gate.auth.adminId,
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, ...result });
  }

  if (action === "duplicate_invoice") {
    const result = await duplicateInvoiceAsDraft(String(body.invoiceId || ""), {
      actor: gate.auth.actor,
      adminId: gate.auth.adminId,
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, ...result });
  }

  if (action === "load_invoice") {
    const invoiceId = String(body.invoiceId || "").trim();
    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: "invoiceId required" },
        { status: 400 }
      );
    }
    const inv = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        bookingId: true,
        reservationId: true,
        status: true,
        source: true,
        kind: true,
        total: true,
        snapshotJson: true,
      },
    });
    if (!inv || inv.kind !== "STANDARD") {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }
    let snap: InvoiceFareSnapshot;
    try {
      snap = JSON.parse(inv.snapshotJson) as InvoiceFareSnapshot;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid invoice snapshot" },
        { status: 400 }
      );
    }
    return NextResponse.json({
      success: true,
      invoice: snapshotToFormPayload(inv, snap),
    });
  }

  if (action === "create_payment_link") {
    try {
      const link = await createManualInvoicePaymentLink({
        invoiceId: String(body.invoiceId || ""),
        returnBaseUrl: body.returnBaseUrl,
        actor: gate.auth.actor,
        adminId: gate.auth.adminId,
      });
      return NextResponse.json({ success: true, ...link });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : "Link failed" },
        { status: 400 }
      );
    }
  }

  if (action === "create_payment_intent") {
    try {
      const pi = await createManualInvoicePaymentIntent({
        invoiceId: String(body.invoiceId || ""),
        actor: gate.auth.actor,
        adminId: gate.auth.adminId,
      });
      return NextResponse.json({ success: true, ...pi });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : "Payment intent failed" },
        { status: 400 }
      );
    }
  }

  if (action === "confirm_manual_paid") {
    const paymentIntentId =
      typeof body.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";
    if (!paymentIntentId.startsWith("pi_")) {
      return NextResponse.json(
        { success: false, error: "Valid paymentIntentId required" },
        { status: 400 }
      );
    }
    const result = await markManualInvoicePaidAndDeliver({
      invoiceId: String(body.invoiceId || ""),
      paymentIntentId,
      verifyPayment: true,
      actor: gate.auth.actor,
      adminId: gate.auth.adminId,
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, ...result });
  }

  if (action === "process_jobs") {
    await processInvoiceJobs();
    return NextResponse.json({ success: true });
  }

  if (action === "load_reservation") {
    const key = String(body.bookingId || body.reservationId || "").trim();
    if (!key) {
      return NextResponse.json(
        { success: false, error: "Booking id required (e.g. SARJ-…)" },
        { status: 400 }
      );
    }
    const r =
      (await prisma.reservation.findUnique({ where: { bookingId: key } })) ||
      (await prisma.reservation.findUnique({ where: { id: key } }));
    if (!r) {
      return NextResponse.json(
        { success: false, error: "Reservation not found" },
        { status: 404 }
      );
    }

    const st = String(r.serviceType || "").trim();
    let serviceTypeValue = st || "Point-to-Point transportation";
    if (/parcel/i.test(st)) serviceTypeValue = "Parcel Delivery";
    else if (/hourly/i.test(st)) serviceTypeValue = "Hourly ride";
    else if (/point|distance/i.test(st)) {
      serviceTypeValue = "Point-to-Point transportation";
    }

    const stops = String(r.stops || "")
      .split(/[|\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" | ");

    const lines: { label: string; amount: number }[] = [];
    const ride = Number(r.rideFare) || 0;
    const stopCh = Number(r.stopCharge) || 0;
    const childCh = Number(r.childSeatCharge) || 0;
    const sub = Number(r.subtotal) || 0;
    const discount = Number(r.discountAmount) || 0;
    const gratuity = Number(r.gratuity) || 0;
    const notes = String(r.specialRequirements || "");

    if (ride > 0) lines.push({ label: "Ride fare", amount: Math.round(ride * 100) / 100 });
    if (stopCh > 0) lines.push({ label: "Stops", amount: Math.round(stopCh * 100) / 100 });
    if (childCh > 0) {
      lines.push({ label: "Child seat(s)", amount: Math.round(childCh * 100) / 100 });
    }
    if (/Meet\s*&\s*Greet:\s*Yes/i.test(notes)) {
      lines.push({ label: "Meet & Greet", amount: MEET_GREET_CHARGE });
    }
    if (/Bouquet of Flowers:\s*Yes/i.test(notes)) {
      lines.push({ label: "Bouquet of Flowers", amount: BOUQUET_CHARGE });
    }
    const airportMatch = notes.match(
      /Airport pickup fee[^:]*:\s*\$?\s*([\d.]+)/i
    );
    if (airportMatch) {
      const amt = Number(airportMatch[1]);
      lines.push({
        label: "Airport pickup fee (GTAA)",
        amount: Number.isFinite(amt) && amt > 0 ? Math.round(amt * 100) / 100 : AIRPORT_PICKUP_FEE,
      });
    } else if (/Airport pickup fee/i.test(notes)) {
      lines.push({ label: "Airport pickup fee (GTAA)", amount: AIRPORT_PICKUP_FEE });
    }

    const explained = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    // Prefer booking pre-tax subtotal when itemized extras don't match (promo / custom).
    if (
      discount > 0 &&
      Math.abs(explained - discount - sub) <= 0.05 &&
      sub > 0
    ) {
      lines.push({
        label: "Discount",
        amount: -Math.round(discount * 100) / 100,
      });
    } else if (sub > 0 && Math.abs(explained - sub) > 0.05) {
      lines.length = 0;
      lines.push({ label: "Trip charges", amount: Math.round(sub * 100) / 100 });
    } else if (!lines.length && sub > 0) {
      lines.push({ label: "Ride fare", amount: Math.round(sub * 100) / 100 });
    }

    // Normalize for HTML date / time inputs (handles "9:00:00 PM")
    const rawDate = String(r.serviceDate || "").trim();
    const serviceDate = /^\d{4}-\d{2}-\d{2}/.test(rawDate)
      ? rawDate.slice(0, 10)
      : rawDate;
    const rawTime = String(r.serviceTime || "").trim();
    let serviceTime = rawTime;
    const ampm = rawTime.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (ampm) {
      let h = Number(ampm[1]);
      const min = ampm[2];
      const ap = ampm[3].toUpperCase();
      if (ap === "PM" && h < 12) h += 12;
      if (ap === "AM" && h === 12) h = 0;
      serviceTime = `${String(h).padStart(2, "0")}:${min}`;
    } else {
      const m24 = rawTime.match(/^(\d{1,2}):(\d{2})/);
      if (m24) {
        serviceTime = `${m24[1].padStart(2, "0")}:${m24[2]}`;
      }
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        bookingId: r.bookingId,
        kind: "STANDARD",
        revision: 0,
        status: { not: "DRAFT" },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        emailStatus: true,
        total: true,
        snapshotJson: true,
      },
    });
    let existingPaid = false;
    if (existingInvoice) {
      try {
        const snap = JSON.parse(existingInvoice.snapshotJson) as {
          paymentStatus?: string;
        };
        existingPaid =
          String(snap.paymentStatus || "").toUpperCase() === "PAID";
      } catch {
        /* ignore */
      }
    }

    const name = `${r.firstName || ""} ${r.lastName || ""}`.trim();
    return NextResponse.json({
      success: true,
      reservation: {
        id: r.id,
        bookingId: r.bookingId,
        status: r.status || "",
        customerName: name || "Guest",
        // Keep full multi-email string — delivery parses the list.
        customerEmail: String(r.email || "").trim(),
        customerPhone: r.phone || "",
        serviceType: serviceTypeValue,
        serviceTypeRaw: st,
        vehicle: r.vehicle || "",
        serviceDate,
        serviceTime,
        pickupLocation: r.pickupLocation || "",
        dropoffLocation: r.dropoffLocation || "",
        stops,
        passengers: String(r.passengers || 1),
        childSeats: String(r.childSeats || 0),
        childSeatType: r.childSeatType || "",
        etr407: r.etr407 || "",
        airline: r.airline || "",
        flightNumber: r.flightNumber || "",
        flightNote: r.flightNote || "",
        distance: r.distance || "",
        duration: r.duration || "",
        // Strip internal booking meta (mode / transfer / adults…) — keep real notes.
        specialRequirements: humanSpecialRequirements(notes),
        promoCode: r.promoCode || "",
        discountAmount: Math.round(Math.max(0, discount) * 100) / 100,
        subtotal: Math.round(Math.max(0, sub) * 100) / 100,
        hst: Math.round(Math.max(0, Number(r.hst) || 0) * 100) / 100,
        bookingTotal: Math.round(Math.max(0, Number(r.total) || 0) * 100) / 100,
        paymentStatus: r.paymentStatus || "",
        cardType: r.cardType || "",
        cardLast4: r.cardLast4 || "",
        gratuity: Math.round(Math.max(0, gratuity) * 100) / 100,
        lines,
        existingInvoice: existingInvoice
          ? {
              id: existingInvoice.id,
              invoiceNumber: existingInvoice.invoiceNumber,
              emailStatus: existingInvoice.emailStatus,
              total: existingInvoice.total,
              paid: existingPaid,
            }
          : null,
      },
    });
  }

  if (action === "delete_invoice") {
    const invoiceId = String(body.invoiceId || "").trim();
    if (!invoiceId) {
      return NextResponse.json({ success: false, error: "invoiceId required" }, { status: 400 });
    }
    const inv = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        bookingId: true,
        source: true,
        total: true,
      },
    });
    if (!inv) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }
    await prisma.invoice.delete({ where: { id: invoiceId } });
    try {
      await prisma.billingAuditLog.create({
        data: {
          actor: gate.auth.actor,
          adminId: gate.auth.adminId || null,
          action: "INVOICE_DELETED",
          invoiceId: null,
          bookingId: inv.bookingId,
          metaJson: JSON.stringify({
            deletedInvoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            source: inv.source,
            total: inv.total,
          }),
        },
      });
    } catch (e) {
      console.error("[billing] delete audit", e);
    }
    return NextResponse.json({
      success: true,
      deletedId: inv.id,
      invoiceNumber: inv.invoiceNumber,
    });
  }

  return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
}
