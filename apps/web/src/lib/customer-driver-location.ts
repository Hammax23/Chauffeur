/**
 * Customer live GPS sharing policy.
 *
 * Location is shared only after the chauffeur is customer-visible (accepted)
 * AND the booking has entered the pre-arrival window:
 *   now >= (serviceDate + serviceTime in America/Toronto) − 10 minutes
 *
 * Once the trip has reached ARRIVED / CIC / STOP, location stays unlocked
 * even if the scheduled clock was wrong (ops already marked on-site).
 */

import { isDriverVisibleToCustomer } from "@/lib/customer-visible-driver";

export const CUSTOMER_LOCATION_TZ = "America/Toronto";
/** Minutes before scheduled pickup when live GPS unlocks for the customer. */
export const CUSTOMER_LOCATION_LEAD_MINUTES = 10;

const LEAD_MS = CUSTOMER_LOCATION_LEAD_MINUTES * 60 * 1000;

/** Statuses where GPS may be shared (after accept + time window / arrived). */
export const CUSTOMER_LOCATION_ELIGIBLE_STATUSES = new Set([
  "ACCEPTED",
  "ON THE WAY",
  "ARRIVED",
  "CIC",
  "STOP",
]);

/** On-site / in-trip — always unlock (scheduled time no longer matters). */
const ALWAYS_UNLOCK_STATUSES = new Set(["ARRIVED", "CIC", "STOP"]);

export type CustomerLocationSharingInput = {
  status: string;
  serviceDate?: string | null;
  serviceTime?: string | null;
  driverResponse?: string | null;
  /** Injected for tests; defaults to Date.now(). */
  nowMs?: number;
};

export type CustomerLocationSharingResult = {
  unlocked: boolean;
  /** ISO timestamp when sharing opens (null if unknown / N/A). */
  unlockAt: string | null;
  /** Scheduled pickup instant in UTC (null if unparseable). */
  serviceAt: string | null;
  reason:
    | "unlocked"
    | "arrived_status"
    | "not_eligible_status"
    | "driver_not_visible"
    | "before_window"
    | "unparseable_schedule";
};

/** Normalize common date strings → { y, m, d } or null. */
export function parseServiceDateParts(
  raw: string | null | undefined
): { y: number; m: number; d: number } | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();

  // YYYY-MM-DD
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) {
    return { y: +m[1], m: +m[2], d: +m[3] };
  }

  // MM/DD/YYYY or M/D/YYYY
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) {
    return { y: +m[3], m: +m[1], d: +m[2] };
  }

  // Fallback: Date parse then read UTC parts (best-effort)
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    return {
      y: dt.getUTCFullYear(),
      m: dt.getUTCMonth() + 1,
      d: dt.getUTCDate(),
    };
  }
  return null;
}

/** Normalize "14:30", "14:30:00", "2:30 PM", "2:30pm" → { h, min, s }. */
export function parseServiceTimeParts(
  raw: string | null | undefined
): { h: number; min: number; s: number } | null {
  if (!raw?.trim()) return null;
  // Normalize NBSP / thin spaces and "2:30pm" → "2:30 PM"
  const s = raw
    .trim()
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(\d)\s*(am|pm)$/i, (_, d, ap) => `${d} ${String(ap).toUpperCase()}`);

  // 12h first (so "12:30 PM" never hits the 24h branch incorrectly after normalize)
  let m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(s);
  if (m) {
    let h = +m[1];
    const min = +m[2];
    const sec = m[3] ? +m[3] : 0;
    const ap = m[4].toUpperCase();
    if (h < 1 || h > 12 || min > 59 || sec > 59) return null;
    if (ap === "AM") {
      if (h === 12) h = 0;
    } else if (h !== 12) {
      h += 12;
    }
    return { h, min, s: sec };
  }

  // 24h: HH:mm or HH:mm:ss
  m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m) {
    const h = +m[1];
    const min = +m[2];
    const sec = m[3] ? +m[3] : 0;
    if (h > 23 || min > 59 || sec > 59) return null;
    return { h, min, s: sec };
  }

  return null;
}

/**
 * Convert a wall-clock time in `timeZone` to a UTC Date.
 * Iteratively corrects for DST using Intl (no extra deps).
 */
export function zonedWallTimeToUtc(
  y: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const desiredAsUtcParts = Date.UTC(y, month - 1, day, hour, minute, second);
  let guess = desiredAsUtcParts;

  for (let i = 0; i < 4; i++) {
    const parts = dtf.formatToParts(new Date(guess));
    const map: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== "literal") map[p.type] = p.value;
    }
    const shown = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute),
      Number(map.second)
    );
    const diff = desiredAsUtcParts - shown;
    if (Math.abs(diff) < 500) break;
    guess += diff;
  }

  return new Date(guess);
}

/** Scheduled pickup instant (UTC) from reservation date/time strings. */
export function parseServiceInstantUtc(
  serviceDate: string | null | undefined,
  serviceTime: string | null | undefined,
  timeZone: string = CUSTOMER_LOCATION_TZ
): Date | null {
  const d = parseServiceDateParts(serviceDate);
  const t = parseServiceTimeParts(serviceTime);
  if (!d || !t) return null;
  if (d.m < 1 || d.m > 12 || d.d < 1 || d.d > 31) return null;
  return zonedWallTimeToUtc(d.y, d.m, d.d, t.h, t.min, t.s, timeZone);
}

export function getCustomerLocationUnlockAt(
  serviceDate: string | null | undefined,
  serviceTime: string | null | undefined
): Date | null {
  const serviceAt = parseServiceInstantUtc(serviceDate, serviceTime);
  if (!serviceAt) return null;
  return new Date(serviceAt.getTime() - LEAD_MS);
}

/**
 * Enterprise gate for sharing chauffeur GPS with the customer.
 */
export function evaluateCustomerLocationSharing(
  input: CustomerLocationSharingInput
): CustomerLocationSharingResult {
  const nowMs = input.nowMs ?? Date.now();
  const serviceAt = parseServiceInstantUtc(input.serviceDate, input.serviceTime);
  const unlockAtDate = serviceAt
    ? new Date(serviceAt.getTime() - LEAD_MS)
    : null;

  const base = {
    unlockAt: unlockAtDate?.toISOString() ?? null,
    serviceAt: serviceAt?.toISOString() ?? null,
  };

  if (!CUSTOMER_LOCATION_ELIGIBLE_STATUSES.has(input.status)) {
    return { ...base, unlocked: false, reason: "not_eligible_status" };
  }

  if (
    !isDriverVisibleToCustomer({
      status: input.status,
      driverResponse: input.driverResponse,
    })
  ) {
    return { ...base, unlocked: false, reason: "driver_not_visible" };
  }

  // Already on-site / in trip — always share.
  if (ALWAYS_UNLOCK_STATUSES.has(input.status)) {
    return { ...base, unlocked: true, reason: "arrived_status" };
  }

  // ACCEPTED / ON THE WAY — require schedule window.
  if (!unlockAtDate || !serviceAt) {
    // Bad/legacy schedule strings: if chauffeur is already en route, share GPS
    // rather than blocking until ARRIVED. ACCEPTED alone stays locked (fail closed).
    if (input.status === "ON THE WAY") {
      return { ...base, unlocked: true, reason: "unlocked" };
    }
    return { ...base, unlocked: false, reason: "unparseable_schedule" };
  }

  if (nowMs < unlockAtDate.getTime()) {
    return { ...base, unlocked: false, reason: "before_window" };
  }

  return { ...base, unlocked: true, reason: "unlocked" };
}

export function isCustomerDriverLocationUnlocked(
  input: CustomerLocationSharingInput
): boolean {
  return evaluateCustomerLocationSharing(input).unlocked;
}

/** Human label for logs / optional API debug (not shown to end users by default). */
export function formatTorontoWall(isoUtc: string | null): string | null {
  if (!isoUtc) return null;
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CUSTOMER_LOCATION_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

/** Debug helper — e.g. unlock window description. */
export function describeUnlockWindow(
  serviceDate: string,
  serviceTime: string
): string {
  const serviceAt = parseServiceInstantUtc(serviceDate, serviceTime);
  const unlockAt = getCustomerLocationUnlockAt(serviceDate, serviceTime);
  return `pickup=${formatTorontoWall(serviceAt?.toISOString() ?? null) ?? "?"} unlock=${formatTorontoWall(unlockAt?.toISOString() ?? null) ?? "?"} lead=${CUSTOMER_LOCATION_LEAD_MINUTES}m tz=${CUSTOMER_LOCATION_TZ}`;
}

