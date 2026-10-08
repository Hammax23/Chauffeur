/**
 * Meet & Greet money rules (Sarj Customer Policy).
 * Fee: $110 + HST (priced at booking).
 * Free wait: 60 minutes after actual landing (or scheduled pickup if landing unknown).
 * Extra wait: $110 CAD / hour + HST (ops-approved or auto at CIC/DONE).
 * No-show: keep 100% of prepaid fare.
 */

import { parsePickupDateTime } from "@/lib/cancel-policy";
import { HST_RATE, MEET_GREET_CHARGE } from "@/lib/reservation-pricing";

export const MG_FEE_CAD = MEET_GREET_CHARGE;
export const MG_FREE_WAIT_MINUTES = 60;
export const MG_WAIT_RATE_PER_HOUR = 110;

export function reservationHasMeetGreet(opts: {
  specialRequirements?: string | null;
  meetGreetCharge?: number | null;
}): boolean {
  if (typeof opts.meetGreetCharge === "number" && opts.meetGreetCharge > 0) return true;
  return /Meet\s*&\s*Greet\s*:\s*Yes/i.test(String(opts.specialRequirements || ""));
}

export function resolveMgWaitClockStart(opts: {
  actualLandingAt?: Date | null;
  serviceDate?: string | null;
  serviceTime?: string | null;
}): Date | null {
  if (opts.actualLandingAt instanceof Date && !Number.isNaN(opts.actualLandingAt.getTime())) {
    return opts.actualLandingAt;
  }
  return parsePickupDateTime(opts.serviceDate, opts.serviceTime);
}

export function computeMgWaitCharge(opts: {
  startedAt: Date;
  endedAt: Date;
}): {
  waitedMinutes: number;
  billableMinutes: number;
  amount: number;
  hst: number;
  total: number;
} {
  const ms = opts.endedAt.getTime() - opts.startedAt.getTime();
  const waitedMinutes = Math.max(0, Math.floor(ms / 60000));
  const billableMinutes = Math.max(0, waitedMinutes - MG_FREE_WAIT_MINUTES);
  const amount =
    Math.round((billableMinutes / 60) * MG_WAIT_RATE_PER_HOUR * 100) / 100;
  const hst = Math.round(amount * HST_RATE * 100) / 100;
  const total = Math.round((amount + hst) * 100) / 100;
  return { waitedMinutes, billableMinutes, amount, hst, total };
}
