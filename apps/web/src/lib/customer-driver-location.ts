/**
 * Customer live GPS sharing policy.
 *
 * Location unlocks when the chauffeur marks On the Way, and stays unlocked
 * through ARRIVED / CIC / STOP. ACCEPTED stays locked — no schedule / T−10 window.
 */

import { isDriverVisibleToCustomer } from "@/lib/customer-visible-driver";

export const CUSTOMER_LOCATION_TZ = "America/Toronto";
/**
 * Legacy field kept for API compatibility. Status-based policy → always 0
 * (no pre-pickup lead window).
 */
export const CUSTOMER_LOCATION_LEAD_MINUTES = 0;

/** Statuses that may show locked / live location UI on the client. */
export const CUSTOMER_LOCATION_ELIGIBLE_STATUSES = new Set([
  "ACCEPTED",
  "ON THE WAY",
  "ARRIVED",
  "CIC",
  "STOP",
]);

/** En route / on-site / in-trip — share live GPS with the customer. */
const UNLOCK_STATUSES = new Set(["ON THE WAY", "ARRIVED", "CIC", "STOP"]);

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
  /** Always null under arrived-only policy (no schedule unlock). */
  unlockAt: string | null;
  /** Scheduled pickup instant in UTC (null if unparseable). */
  serviceAt: string | null;
  reason:
    | "unlocked"
    | "arrived_status"
    | "not_eligible_status"
    | "driver_not_visible"
    | "awaiting_on_the_way"
    | "awaiting_arrived"
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

/** @deprecated Status-based policy — no schedule unlock; always returns null. */
export function getCustomerLocationUnlockAt(
  _serviceDate: string | null | undefined,
  _serviceTime: string | null | undefined
): Date | null {
  return null;
}

/**
 * Enterprise gate for sharing chauffeur GPS with the customer.
 * Unlocks on ON THE WAY / ARRIVED / CIC / STOP.
 */
export function evaluateCustomerLocationSharing(
  input: CustomerLocationSharingInput
): CustomerLocationSharingResult {
  const serviceAt = parseServiceInstantUtc(input.serviceDate, input.serviceTime);

  const base = {
    unlockAt: null as string | null,
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

  if (UNLOCK_STATUSES.has(input.status)) {
    return {
      ...base,
      unlocked: true,
      reason: input.status === "ON THE WAY" ? "unlocked" : "arrived_status",
    };
  }

  // ACCEPTED — locked until chauffeur marks On the Way.
  return { ...base, unlocked: false, reason: "awaiting_on_the_way" };
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

/** Debug helper — schedule context (unlock is status-based, not schedule-based). */
export function describeUnlockWindow(
  serviceDate: string,
  serviceTime: string
): string {
  const serviceAt = parseServiceInstantUtc(serviceDate, serviceTime);
  return `pickup=${formatTorontoWall(serviceAt?.toISOString() ?? null) ?? "?"} unlock=on_ON_THE_WAY lead=${CUSTOMER_LOCATION_LEAD_MINUTES}m tz=${CUSTOMER_LOCATION_TZ}`;
}

