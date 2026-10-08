/**
 * Sarj Customer Policy — cancel money rules (server source of truth).
 * Regular: ≥2h before pickup = free; &lt;2h = keep 100%.
 * Long distance: ≥24h free; 12–24h keep 50%; &lt;12h keep 100%.
 */

export const REGULAR_FREE_CANCEL_MINUTES = 120;
export const LONG_DISTANCE_FREE_HOURS = 24;
export const LONG_DISTANCE_HALF_HOURS = 12;
/** Route km at/above this → isLongDistance (admin can override). */
export const LONG_DISTANCE_KM_DEFAULT = 100;

export type CancelMoneyDecision = {
  refundPercent: number;
  keepPercent: number;
  label: string;
  isLongDistance: boolean;
  minutesUntilPickup: number | null;
  freeUntil: Date | null;
};

export function parsePickupDateTime(
  serviceDate: string | null | undefined,
  serviceTime: string | null | undefined
): Date | null {
  const dateRaw = (serviceDate || "").trim();
  const timeRaw = (serviceTime || "").trim();
  if (!dateRaw) return null;

  let hours = 12;
  let minutes = 0;
  const ampm = timeRaw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const h24 = timeRaw.match(/^(\d{1,2}):(\d{2})$/);
  if (ampm) {
    hours = parseInt(ampm[1], 10) % 12;
    if (ampm[3].toUpperCase() === "PM") hours += 12;
    minutes = parseInt(ampm[2], 10);
  } else if (h24) {
    hours = parseInt(h24[1], 10);
    minutes = parseInt(h24[2], 10);
  }

  const base = dateRaw.includes("T")
    ? new Date(dateRaw)
    : new Date(
        `${dateRaw}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`
      );
  if (Number.isNaN(base.getTime())) return null;
  if (!dateRaw.includes("T")) {
    base.setHours(hours, minutes, 0, 0);
  }
  return base;
}

export function parseDistanceKm(
  distance?: string | null,
  distanceMeters?: number | null
): number | null {
  if (typeof distanceMeters === "number" && Number.isFinite(distanceMeters) && distanceMeters > 0) {
    return distanceMeters / 1000;
  }
  const raw = String(distance || "").trim();
  if (!raw) return null;
  const m = raw.match(/([\d.]+)\s*(km|mi|m)?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = (m[2] || "km").toLowerCase();
  if (unit === "mi") return n * 1.60934;
  if (unit === "m" && n > 100) return n / 1000;
  return n;
}

export function resolveIsLongDistance(opts: {
  flag?: boolean | null;
  distanceKm?: number | null;
  thresholdKm?: number;
}): boolean {
  if (opts.flag === true) return true;
  const km = opts.distanceKm;
  const threshold = opts.thresholdKm ?? LONG_DISTANCE_KM_DEFAULT;
  return typeof km === "number" && km >= threshold;
}

/**
 * @param actor customer | company — company/driver cancel always full refund
 */
export function getCancelMoneyDecision(opts: {
  serviceDate: string;
  serviceTime: string;
  isLongDistance?: boolean;
  now?: Date;
  actor?: "customer" | "company";
}): CancelMoneyDecision {
  const now = opts.now ?? new Date();
  const pickup = parsePickupDateTime(opts.serviceDate, opts.serviceTime);
  const isLongDistance = !!opts.isLongDistance;

  if (opts.actor === "company") {
    return {
      refundPercent: 100,
      keepPercent: 0,
      label: "Company / driver cancel — full refund",
      isLongDistance,
      minutesUntilPickup: pickup
        ? Math.round((pickup.getTime() - now.getTime()) / 60000)
        : null,
      freeUntil: null,
    };
  }

  if (!pickup) {
    // Fail open for customer if we cannot parse pickup: treat as free cancel window unknown → no refund auto (ops)
    // Safer for business: keep 100% if unknown schedule; prefer free if far? Keep 0 refund to avoid wrong refunds.
    return {
      refundPercent: 0,
      keepPercent: 100,
      label: "Unable to verify pickup time — fare kept (contact support if needed)",
      isLongDistance,
      minutesUntilPickup: null,
      freeUntil: null,
    };
  }

  const msUntil = pickup.getTime() - now.getTime();
  const minutesUntilPickup = Math.round(msUntil / 60000);
  const hoursUntil = msUntil / (3600 * 1000);

  if (isLongDistance) {
    const freeUntil = new Date(pickup.getTime() - LONG_DISTANCE_FREE_HOURS * 3600 * 1000);
    if (hoursUntil >= LONG_DISTANCE_FREE_HOURS) {
      return {
        refundPercent: 100,
        keepPercent: 0,
        label: "Long distance — free cancel (24+ hours before pickup)",
        isLongDistance: true,
        minutesUntilPickup,
        freeUntil,
      };
    }
    if (hoursUntil >= LONG_DISTANCE_HALF_HOURS) {
      return {
        refundPercent: 50,
        keepPercent: 50,
        label: "Long distance — 50% charge (12–24 hours before pickup)",
        isLongDistance: true,
        minutesUntilPickup,
        freeUntil,
      };
    }
    return {
      refundPercent: 0,
      keepPercent: 100,
      label: "Long distance — full charge (under 12 hours before pickup)",
      isLongDistance: true,
      minutesUntilPickup,
      freeUntil,
    };
  }

  const freeUntil = new Date(pickup.getTime() - REGULAR_FREE_CANCEL_MINUTES * 60 * 1000);
  if (minutesUntilPickup >= REGULAR_FREE_CANCEL_MINUTES) {
    return {
      refundPercent: 100,
      keepPercent: 0,
      label: "Free cancel (2+ hours before pickup)",
      isLongDistance: false,
      minutesUntilPickup,
      freeUntil,
    };
  }
  return {
    refundPercent: 0,
    keepPercent: 100,
    label: "Full charge (less than 2 hours before pickup)",
    isLongDistance: false,
    minutesUntilPickup,
    freeUntil,
  };
}

export function extractStripePaymentIntentId(
  reservation: {
    stripePaymentIntentId?: string | null;
    specialRequirements?: string | null;
  }
): string | null {
  const col = String(reservation.stripePaymentIntentId || "").trim();
  if (col.startsWith("pi_")) return col;
  const req = String(reservation.specialRequirements || "");
  const m = req.match(/\b(pi_[A-Za-z0-9]+)\b/);
  return m?.[1] || null;
}
