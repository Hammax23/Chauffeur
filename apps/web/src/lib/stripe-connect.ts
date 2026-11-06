// @ts-nocheck
/**
 * Stripe Connect (Express) — Phase 2 opt-in driver payout rail for SARJ Chauffeur.
 *
 * Phase 1 "Mark Paid" (Interac / EFT / cheque) remains the default. This library turns
 * on an additional path:
 *   - Driver (or admin) kicks off onboarding → Stripe-hosted Express onboarding URL.
 *   - When Stripe fires `account.updated`, we mirror the account flags into the
 *     Driver row (`stripeConnectStatus = ENABLED` when `payouts_enabled && charges_enabled`).
 *   - When admin clicks "Mark Paid" AND the driver's Connect account is ENABLED
 *     AND `STRIPE_CONNECT_ENABLED=true` in env, a Stripe Transfer is created for the
 *     payout amount and the transfer id is stored on `DriverPayout.stripeTransferId`.
 *
 * Safety:
 *   - Everything in this file no-ops gracefully when STRIPE_SECRET_KEY is missing or when
 *     `isStripeConnectEnabled()` returns false. Callers can call freely without guards.
 *   - We never auto-upgrade a driver's Connect status silently — only the webhook /
 *     explicit status fetch moves them between PENDING / RESTRICTED / ENABLED.
 */

import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { writeAudit } from "@/lib/driver-pay";

// ─── Env + singleton ───────────────────────────────────────────────────────

export type StripeConnectStatus = "NOT_STARTED" | "PENDING" | "RESTRICTED" | "ENABLED";

/**
 * Hard kill-switch. Set `STRIPE_CONNECT_ENABLED=true` in `.env` to allow the server to
 * create Transfer objects on Mark Paid. Onboarding endpoints still work without the
 * flag — admins can collect Connect account ids ahead of switching the rail on.
 */
export function isStripeConnectEnabled(): boolean {
  return String(process.env.STRIPE_CONNECT_ENABLED || "").toLowerCase() === "true";
}

let _stripeSingleton: Stripe | null = null;
export function getStripeConnect(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (_stripeSingleton) return _stripeSingleton;
  _stripeSingleton = new Stripe(key);
  return _stripeSingleton;
}

// ─── URL helpers ───────────────────────────────────────────────────────────

/** Where Stripe redirects the driver on expired / cancelled onboarding links. */
export function connectRefreshUrl(driverId: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://sarjworldwide.ca").replace(/\/$/, "");
  return `${base}/api/driver/connect/refresh?d=${encodeURIComponent(driverId)}`;
}

/** Where Stripe redirects the driver after submitting the onboarding form. */
export function connectReturnUrl(driverId: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://sarjworldwide.ca").replace(/\/$/, "");
  return `${base}/api/driver/connect/return?d=${encodeURIComponent(driverId)}`;
}

// ─── Status helpers ────────────────────────────────────────────────────────

/** Compute our internal status from a fetched Stripe.Account. */
export function deriveStatus(account: Stripe.Account | null | undefined): StripeConnectStatus {
  if (!account) return "NOT_STARTED";
  if (account.payouts_enabled && account.charges_enabled) return "ENABLED";
  // disabled_reason or requirements.disabled_reason indicates restriction.
  const disabled = (account.requirements?.disabled_reason as string | null) || null;
  if (disabled) return "RESTRICTED";
  return "PENDING";
}

/** Sync-worthy fields we show to the admin + driver on the status endpoint. */
export type ConnectStatusSnapshot = {
  status: StripeConnectStatus;
  stripeAccountId: string | null;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  requirementsDue: string[];
  requirementsDisabledReason: string | null;
  updatedAt: string | null;
};

// ─── Account create / onboarding ───────────────────────────────────────────

/**
 * Ensure the driver has a Stripe Express account. Creates one on first call. Writes
 * audit. Returns the acct_… id.
 *
 * Throws if Stripe is not configured — callers should surface a 503 to the client.
 */
export async function ensureConnectAccountForDriver(
  driver: {
    id: string;
    email: string;
    phone: string | null;
    name: string;
    stripeConnectAccountId: string | null;
  },
  actor: string = "admin"
): Promise<string> {
  const stripe = getStripeConnect();
  if (!stripe) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing)");
  }

  if (driver.stripeConnectAccountId) return driver.stripeConnectAccountId;

  const account = await stripe.accounts.create({
    type: "express",
    country: "CA",
    email: driver.email,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: "individual",
    business_profile: {
      product_description: "Chauffeur driving services for SARJ Worldwide",
    },
    metadata: {
      sarjDriverId: driver.id,
    },
  });

  await prisma.driver.update({
    where: { id: driver.id },
    data: {
      stripeConnectAccountId: account.id,
      stripeConnectStatus: "PENDING",
      stripeConnectUpdatedAt: new Date(),
    },
  });

  await writeAudit({
    action: "connect_account_created",
    entityType: "CONNECT",
    entityId: driver.id,
    details: { stripeAccountId: account.id },
    actor,
  });

  return account.id;
}

/** Create a Stripe-hosted Express onboarding URL for the driver. */
export async function createConnectOnboardingLink(
  driver: {
    id: string;
    email: string;
    phone: string | null;
    name: string;
    stripeConnectAccountId: string | null;
  },
  actor: string = "admin"
): Promise<{ url: string; stripeAccountId: string; expiresAt: number }> {
  const stripe = getStripeConnect();
  if (!stripe) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing)");
  }

  const accountId = await ensureConnectAccountForDriver(driver, actor);

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: connectRefreshUrl(driver.id),
    return_url: connectReturnUrl(driver.id),
    type: "account_onboarding",
  });

  await writeAudit({
    action: "connect_link_created",
    entityType: "CONNECT",
    entityId: driver.id,
    details: { stripeAccountId: accountId, expiresAt: link.expires_at },
    actor,
  });

  return { url: link.url, stripeAccountId: accountId, expiresAt: link.expires_at };
}

/** Fetch current Stripe.Account and mirror status onto the Driver row. */
export async function refreshConnectStatusForDriver(
  driverId: string,
  actor: string = "admin"
): Promise<ConnectStatusSnapshot> {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new Error("Driver not found");

  const stripe = getStripeConnect();
  if (!stripe || !driver.stripeConnectAccountId) {
    return {
      status: (driver.stripeConnectStatus as StripeConnectStatus) || "NOT_STARTED",
      stripeAccountId: driver.stripeConnectAccountId,
      payoutsEnabled: false,
      chargesEnabled: false,
      requirementsDue: [],
      requirementsDisabledReason: null,
      updatedAt: driver.stripeConnectUpdatedAt
        ? driver.stripeConnectUpdatedAt.toISOString()
        : null,
    };
  }

  let account: Stripe.Account | null = null;
  try {
    account = await stripe.accounts.retrieve(driver.stripeConnectAccountId);
  } catch (err: any) {
    console.error("[stripe-connect] retrieve failed", err?.message);
  }

  const status = deriveStatus(account);
  const updatedAt = new Date();

  await prisma.driver.update({
    where: { id: driverId },
    data: {
      stripeConnectStatus: status,
      stripeConnectUpdatedAt: updatedAt,
    },
  });

  await writeAudit({
    action: "connect_status_refreshed",
    entityType: "CONNECT",
    entityId: driverId,
    details: {
      status,
      payoutsEnabled: !!account?.payouts_enabled,
      chargesEnabled: !!account?.charges_enabled,
      disabledReason: account?.requirements?.disabled_reason || null,
    },
    actor,
  });

  return {
    status,
    stripeAccountId: driver.stripeConnectAccountId,
    payoutsEnabled: !!account?.payouts_enabled,
    chargesEnabled: !!account?.charges_enabled,
    requirementsDue: [
      ...((account?.requirements?.currently_due as string[] | undefined) || []),
      ...((account?.requirements?.past_due as string[] | undefined) || []),
    ],
    requirementsDisabledReason: (account?.requirements?.disabled_reason as string | null) || null,
    updatedAt: updatedAt.toISOString(),
  };
}

// ─── Mark Paid → Transfer ──────────────────────────────────────────────────

/**
 * Create a Transfer for the payout. Returns the transfer id. No-ops (returns null) when
 * Connect is disabled, the driver is not onboarded ENABLED, or Stripe is not configured.
 *
 * Use an idempotency key based on the payout id so retries never double-pay.
 */
export async function createConnectTransferForPayout(opts: {
  payoutId: string;
  driverId: string;
  amountCad: number;
  idempotencyKey?: string;
  actor?: string;
}): Promise<
  | { ok: true; transferId: string; amountCents: number }
  | { ok: false; error: string; code?: string }
> {
  if (!isStripeConnectEnabled()) {
    return { ok: false, error: "Stripe Connect not enabled", code: "CONNECT_DISABLED" };
  }
  const stripe = getStripeConnect();
  if (!stripe) {
    return { ok: false, error: "Stripe not configured", code: "NO_STRIPE_KEY" };
  }

  const driver = await prisma.driver.findUnique({
    where: { id: opts.driverId },
    select: { id: true, stripeConnectAccountId: true, stripeConnectStatus: true },
  });
  if (!driver) {
    return { ok: false, error: "Driver not found", code: "NOT_FOUND" };
  }
  if (!driver.stripeConnectAccountId) {
    return { ok: false, error: "Driver has no Connect account", code: "NO_ACCOUNT" };
  }
  if (driver.stripeConnectStatus !== "ENABLED") {
    return {
      ok: false,
      error: `Driver Connect status is ${driver.stripeConnectStatus} — must be ENABLED`,
      code: "NOT_ENABLED",
    };
  }

  const amountCents = Math.round(Math.max(0, Number(opts.amountCad) || 0) * 100);
  if (amountCents < 1) {
    return { ok: false, error: "Amount must be > $0", code: "ZERO_AMOUNT" };
  }

  try {
    const transfer = await stripe.transfers.create(
      {
        amount: amountCents,
        currency: "cad",
        destination: driver.stripeConnectAccountId,
        description: `SARJ driver payout ${opts.payoutId}`,
        metadata: {
          sarjPayoutId: opts.payoutId,
          sarjDriverId: driver.id,
        },
      },
      {
        idempotencyKey: opts.idempotencyKey || `payout-transfer:${opts.payoutId}`,
      }
    );

    await writeAudit({
      action: "connect_transfer_created",
      entityType: "CONNECT",
      entityId: driver.id,
      details: {
        payoutId: opts.payoutId,
        transferId: transfer.id,
        amountCents,
      },
      actor: opts.actor,
    });

    return { ok: true, transferId: transfer.id, amountCents };
  } catch (err: any) {
    const message = err?.message || "Transfer failed";
    const code = err?.code || "STRIPE_ERROR";
    await writeAudit({
      action: "connect_transfer_failed",
      entityType: "CONNECT",
      entityId: driver.id,
      details: { payoutId: opts.payoutId, amountCents, code, message },
      actor: opts.actor,
    });
    return { ok: false, error: message, code };
  }
}

// ─── Webhook helper ────────────────────────────────────────────────────────

/**
 * Apply an `account.updated` Stripe webhook payload to the matching Driver. Returns
 * `{ matched: boolean, status }`. Written as a separate function so the webhook route
 * can stay thin and testable.
 */
export async function applyAccountUpdatedWebhook(
  account: Stripe.Account
): Promise<{ matched: boolean; status: StripeConnectStatus }> {
  const driver = await prisma.driver.findUnique({
    where: { stripeConnectAccountId: account.id },
  });
  if (!driver) return { matched: false, status: deriveStatus(account) };

  const status = deriveStatus(account);
  await prisma.driver.update({
    where: { id: driver.id },
    data: {
      stripeConnectStatus: status,
      stripeConnectUpdatedAt: new Date(),
    },
  });

  await writeAudit({
    action: "connect_webhook_account_updated",
    entityType: "CONNECT",
    entityId: driver.id,
    details: {
      status,
      payoutsEnabled: !!account.payouts_enabled,
      chargesEnabled: !!account.charges_enabled,
      disabledReason: account.requirements?.disabled_reason || null,
    },
    actor: "stripe_webhook",
  });

  return { matched: true, status };
}
