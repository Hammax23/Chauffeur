import type { Reservation } from "../services/api";

function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n?: number | null): string {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `$${Number(n).toFixed(2)}`;
}

function formatDate(serviceDate: string, serviceTime: string): string {
  const time = (serviceTime || "").trim() || "—";
  const raw = (serviceDate || "").trim();
  if (!raw) return time;
  const parsed = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return `${raw} · ${time}`;
  const date = parsed.toLocaleDateString("en-CA", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return `${date} · ${time}`;
}

function statusLabel(r: Reservation): string {
  if (r.status === "DONE") return "Completed";
  if (r.status === "NO_SHOW") return "No-show";
  if (r.status === "CANCELLED" || r.status === "CANCELED") return "Cancelled";
  if (!r.driver) return "Confirmed";
  if (r.status === "ON THE WAY") return "On the way";
  if (r.status === "ARRIVED") return "Arrived";
  if (r.status === "CIC") return "In trip";
  if (r.status === "STOP") return "Stop";
  return "Chauffeur assigned";
}

/** Professional SARJ invoice HTML for expo-print → PDF. */
export function buildReservationInvoiceHtml(r: Reservation): string {
  const guest = `${r.firstName || ""} ${r.lastName || ""}`.trim() || "Guest";
  const issued = new Date().toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const stops = (r.stops || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const lines: { label: string; value: string; strong?: boolean }[] = [];
  if (r.rideFare != null) lines.push({ label: "Ride fare", value: money(r.rideFare) });
  if (r.subtotal != null && Number(r.subtotal) !== Number(r.rideFare)) {
    lines.push({ label: "Subtotal", value: money(r.subtotal) });
  }
  if (r.hst != null && Number(r.hst) > 0) lines.push({ label: "HST", value: money(r.hst) });
  if (r.gratuity != null && Number(r.gratuity) > 0) {
    lines.push({ label: "Gratuity", value: money(r.gratuity) });
  }
  for (const adj of r.fareAdjustments || []) {
    if (!adj || Number(adj.total) <= 0) continue;
    if (adj.status === "WAIVED") continue;
    const tag =
      adj.status === "PAID" ? "" : adj.status === "FAILED" || adj.status === "PENDING" ? " (unpaid)" : "";
    lines.push({
      label: adj.description || adj.type || "Adjustment",
      value: `${money(adj.total)}${tag}`,
    });
  }
  if (
    r.waitChargeAmount &&
    Number(r.waitChargeAmount) > 0 &&
    !(r.fareAdjustments || []).some((a) => a.type === "WAIT")
  ) {
    lines.push({ label: "Pickup wait", value: money(r.waitChargeAmount) });
  }
  if (
    r.mgWaitChargeAmount &&
    Number(r.mgWaitChargeAmount) > 0 &&
    !(r.fareAdjustments || []).some((a) => a.type === "MG_WAIT")
  ) {
    lines.push({ label: "Meet & Greet wait", value: money(r.mgWaitChargeAmount) });
  }
  const adjustmentsPaid = (r.fareAdjustments || [])
    .filter((a) => a.status === "PAID" || a.status === "PENDING" || a.status === "FAILED")
    .reduce((s, a) => s + (Number(a.total) || 0), 0);
  const grand =
    Math.round(((Number(r.total) || 0) + adjustmentsPaid) * 100) / 100;
  lines.push({
    label: adjustmentsPaid > 0.009 ? "Trip total (CAD)" : "Total (CAD)",
    value: money(r.total),
    strong: adjustmentsPaid <= 0.009,
  });
  if (adjustmentsPaid > 0.009) {
    lines.push({ label: "Grand total (CAD)", value: money(grand), strong: true });
  }

  const fareRows = lines
    .map(
      (row) => `
      <tr>
        <td style="padding:10px 0;color:${row.strong ? "#1C1C1E" : "#6B6B70"};font-weight:${row.strong ? "700" : "500"};border-top:1px solid #E8E4DC;">${esc(row.label)}</td>
        <td style="padding:10px 0;text-align:right;color:${row.strong ? "#B8862E" : "#1C1C1E"};font-weight:${row.strong ? "800" : "600"};border-top:1px solid #E8E4DC;">${esc(row.value)}</td>
      </tr>`
    )
    .join("");

  const stopRows = stops.length
    ? `<div style="margin-top:10px;">
        <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8E8E93;font-weight:700;margin-bottom:4px;">Stops</div>
        <div style="font-size:13px;color:#1C1C1E;line-height:1.45;">${stops.map((s) => esc(s)).join("<br/>")}</div>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${esc(r.bookingId)}</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1C1C1E;">
  <div style="max-width:680px;margin:0 auto;padding:36px 28px 48px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:28px;">
      <div>
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D4A04A;font-weight:800;margin-bottom:6px;">SARJ Worldwide</div>
        <div style="font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#1C1C1E;">Invoice</div>
        <div style="margin-top:6px;font-size:13px;color:#6B6B70;">Luxury chauffeur services</div>
      </div>
      <div style="text-align:right;font-size:12px;color:#6B6B70;line-height:1.55;">
        <div>reserve@sarjworldwide.ca</div>
        <div>+1 416-893-5779</div>
        <div>sarjworldwide.ca</div>
      </div>
    </div>

    <div style="background:#fff;border:1px solid #E8E4DC;border-radius:16px;padding:22px 22px 8px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
        <div>
          <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8E8E93;font-weight:700;">Invoice #</div>
          <div style="font-size:16px;font-weight:800;color:#B8862E;margin-top:2px;">${esc(r.bookingId)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8E8E93;font-weight:700;">Issued</div>
          <div style="font-size:14px;font-weight:600;margin-top:2px;">${esc(issued)}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-top:12px;border-top:1px solid #E8E4DC;margin-bottom:14px;">
        <div>
          <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8E8E93;font-weight:700;">Billed to</div>
          <div style="font-size:15px;font-weight:700;margin-top:2px;">${esc(guest)}</div>
          <div style="font-size:12px;color:#6B6B70;margin-top:2px;">${esc(r.email || "")}</div>
          ${r.phone ? `<div style="font-size:12px;color:#6B6B70;">${esc(r.phone)}</div>` : ""}
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8E8E93;font-weight:700;">Status</div>
          <div style="display:inline-block;margin-top:4px;padding:4px 10px;border-radius:999px;background:rgba(212,160,74,0.14);color:#7A5A28;font-size:12px;font-weight:700;">${esc(statusLabel(r))}</div>
        </div>
      </div>
    </div>

    <div style="background:#fff;border:1px solid #E8E4DC;border-radius:16px;padding:22px;margin-bottom:16px;">
      <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8E8E93;font-weight:700;margin-bottom:12px;">Trip details</div>
      <div style="margin-bottom:12px;">
        <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8E8E93;font-weight:700;">Service date</div>
        <div style="font-size:14px;font-weight:600;margin-top:2px;">${esc(formatDate(r.serviceDate, r.serviceTime))}</div>
      </div>
      <div style="margin-bottom:12px;">
        <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8E8E93;font-weight:700;">Vehicle</div>
        <div style="font-size:14px;font-weight:600;margin-top:2px;">${esc(r.vehicle || "—")}</div>
      </div>
      <div style="margin-bottom:12px;">
        <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8E8E93;font-weight:700;">Service</div>
        <div style="font-size:14px;font-weight:600;margin-top:2px;">${esc(r.serviceType || "Chauffeur")}</div>
      </div>
      <div style="margin-bottom:10px;">
        <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8E8E93;font-weight:700;">Pickup</div>
        <div style="font-size:14px;font-weight:600;margin-top:2px;line-height:1.4;">${esc(r.pickupLocation || "—")}</div>
      </div>
      <div>
        <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8E8E93;font-weight:700;">Drop-off</div>
        <div style="font-size:14px;font-weight:600;margin-top:2px;line-height:1.4;">${esc(r.dropoffLocation || "—")}</div>
      </div>
      ${stopRows}
    </div>

    <div style="background:#fff;border:1px solid #E8E4DC;border-radius:16px;padding:18px 22px;margin-bottom:20px;">
      <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8E8E93;font-weight:700;margin-bottom:4px;">Fare summary</div>
      <table style="width:100%;border-collapse:collapse;">${fareRows}</table>
      <div style="margin-top:4px;font-size:11px;color:#8E8E93;">Payment: ${esc(r.paymentStatus || "—")}</div>
    </div>

    <div style="text-align:center;font-size:11px;color:#8E8E93;line-height:1.55;">
      Thank you for riding with SARJ Worldwide.<br/>
      Questions about this invoice? Email reserve@sarjworldwide.ca or call +1 416-893-5779.
    </div>
  </div>
</body>
</html>`;
}

export function invoiceFileName(bookingId: string): string {
  const safe = (bookingId || "reservation").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `SARJ_Invoice_${safe}.pdf`;
}
