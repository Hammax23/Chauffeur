import "server-only";
import prisma from "@/lib/prisma";
import { decryptSecret, encryptSecret, isEncryptionConfigured } from "@/lib/secure-token-crypto";
import { assertIntegrationEnvironmentAllowed } from "@/lib/integrations/env-guard";
import type { InvoiceFareSnapshot } from "@/lib/invoice-types";
import { roundMoney } from "@/lib/invoice-types";

type SyncResult = {
  status: "DONE" | "FAILED" | "SKIPPED";
  docId?: string;
  error?: string;
};

function qbConfigured(): boolean {
  return Boolean(
    process.env.QUICKBOOKS_CLIENT_ID?.trim() &&
      process.env.QUICKBOOKS_CLIENT_SECRET?.trim() &&
      isEncryptionConfigured()
  );
}

async function getQbCredential() {
  return prisma.integrationCredential.findUnique({ where: { provider: "QUICKBOOKS" } });
}

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID!.trim();
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET!.trim();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error || `QuickBooks token refresh failed (${res.status})`);
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || refreshToken,
    expiresIn: json.expires_in || 3600,
  };
}

function qbApiBase(): string {
  const env = (process.env.QUICKBOOKS_ENV || "production").toLowerCase();
  return env === "sandbox"
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";
}

/**
 * Post Sales Receipt (paid) or Credit Memo from immutable snapshot.
 * Skips cleanly when QB is not connected — invoice still valid in SARJ.
 */
export async function syncInvoiceToQuickBooks(invoiceId: string): Promise<SyncResult> {
  try {
    if (!qbConfigured()) {
      return { status: "SKIPPED", error: "QuickBooks env not configured" };
    }
    assertIntegrationEnvironmentAllowed("QUICKBOOKS");

    const cred = await getQbCredential();
    if (!cred?.encryptedRefreshToken || !cred.realmId) {
      return { status: "SKIPPED", error: "QuickBooks not connected by owner" };
    }

    const pinned = process.env.QUICKBOOKS_REALM_ID?.trim();
    if (pinned && cred.realmId !== pinned) {
      return {
        status: "FAILED",
        error: "Connected QuickBooks realm does not match QUICKBOOKS_REALM_ID pin",
      };
    }

    const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    if (inv.qbDocId) return { status: "DONE", docId: inv.qbDocId };

    let accessToken = cred.encryptedAccessToken
      ? decryptSecret(cred.encryptedAccessToken)
      : "";
    const refreshToken = decryptSecret(cred.encryptedRefreshToken);
    const expired =
      !cred.accessTokenExpiresAt || cred.accessTokenExpiresAt.getTime() < Date.now() + 60_000;
    if (!accessToken || expired) {
      const tokens = await refreshAccessToken(refreshToken);
      accessToken = tokens.accessToken;
      await prisma.integrationCredential.update({
        where: { provider: "QUICKBOOKS" },
        data: {
          encryptedAccessToken: encryptSecret(tokens.accessToken),
          encryptedRefreshToken: encryptSecret(tokens.refreshToken),
          accessTokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        },
      });
    }

    const snapshot = JSON.parse(inv.snapshotJson) as InvoiceFareSnapshot;
    const meta = cred.metadataJson ? (JSON.parse(cred.metadataJson) as Record<string, string>) : {};
    const itemIncome = meta.itemIncomeId || process.env.QUICKBOOKS_ITEM_INCOME_ID || "";
    const itemGrat = meta.itemGratuityId || process.env.QUICKBOOKS_ITEM_GRATUITY_ID || itemIncome;
    const itemHst = meta.itemHstId || process.env.QUICKBOOKS_ITEM_HST_ID || "";

    if (!itemIncome) {
      return {
        status: "FAILED",
        error: "QuickBooks income item id not mapped (accountant setup required)",
      };
    }

    const lines = snapshot.lines
      .filter((l) => Math.abs(l.amount) > 0.0001)
      .map((l) => {
        let itemRef = itemIncome;
        if (l.key === "gratuity" && itemGrat) itemRef = itemGrat;
        if (l.key === "hst" && itemHst) itemRef = itemHst;
        return {
          DetailType: "SalesItemLineDetail",
          Amount: roundMoney(Math.abs(l.amount)),
          Description: l.label,
          SalesItemLineDetail: {
            ItemRef: { value: itemRef },
            Qty: 1,
            UnitPrice: roundMoney(Math.abs(l.amount)),
          },
        };
      });

    const isCredit = inv.kind === "CREDIT_NOTE" || snapshot.total < 0;
    const docType = isCredit ? "creditmemo" : "salesreceipt";
    const body = {
      ...(isCredit
        ? {
            CreditMemo: {
              DocNumber: inv.invoiceNumber.slice(0, 21),
              PrivateNote: `SARJ booking ${inv.bookingId}`,
              CustomerMemo: { value: `Booking ${inv.bookingId}` },
              Line: lines,
            },
          }
        : {
            SalesReceipt: {
              DocNumber: inv.invoiceNumber.slice(0, 21),
              PrivateNote: `SARJ booking ${inv.bookingId}`,
              CustomerMemo: { value: `Booking ${inv.bookingId}` },
              Line: lines,
            },
          }),
    };

    // QuickBooks expects the entity as the root object for that endpoint
    const payload = isCredit ? body.CreditMemo : body.SalesReceipt;
    const url = `${qbApiBase()}/v3/company/${cred.realmId}/${docType}?minorversion=65`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as {
      SalesReceipt?: { Id?: string };
      CreditMemo?: { Id?: string };
      Fault?: { Error?: { Message?: string }[] };
    };
    if (!res.ok) {
      const msg =
        json.Fault?.Error?.[0]?.Message || `QuickBooks API ${res.status}`;
      return { status: "FAILED", error: msg };
    }
    const docId = json.SalesReceipt?.Id || json.CreditMemo?.Id || "";
    return { status: "DONE", docId };
  } catch (e: unknown) {
    return {
      status: "FAILED",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function getQuickBooksAuthorizeUrl(state: string): string {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID?.trim();
  const redirect = process.env.QUICKBOOKS_REDIRECT_URI?.trim();
  if (!clientId || !redirect) {
    throw new Error("QUICKBOOKS_CLIENT_ID / QUICKBOOKS_REDIRECT_URI missing");
  }
  const scope = encodeURIComponent("com.intuit.quickbooks.accounting");
  return `https://appcenter.intuit.com/connect/oauth2?client_id=${encodeURIComponent(clientId)}&response_type=code&scope=${scope}&redirect_uri=${encodeURIComponent(redirect)}&state=${encodeURIComponent(state)}`;
}

export async function exchangeQuickBooksCode(opts: {
  code: string;
  realmId: string;
  connectedByAdminId?: string | null;
  connectedByEmail?: string | null;
}): Promise<void> {
  if (!isEncryptionConfigured()) {
    throw new Error("INTEGRATION_TOKEN_ENCRYPTION_KEY required");
  }
  const clientId = process.env.QUICKBOOKS_CLIENT_ID!.trim();
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET!.trim();
  const redirect = process.env.QUICKBOOKS_REDIRECT_URI!.trim();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: opts.code,
      redirect_uri: redirect,
    }),
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !json.refresh_token || !json.access_token) {
    throw new Error(json.error || "QuickBooks OAuth exchange failed");
  }

  const pinned = process.env.QUICKBOOKS_REALM_ID?.trim();
  if (pinned && opts.realmId !== pinned) {
    throw new Error("Connected company realmId does not match QUICKBOOKS_REALM_ID pin");
  }

  await prisma.integrationCredential.upsert({
    where: { provider: "QUICKBOOKS" },
    create: {
      provider: "QUICKBOOKS",
      encryptedRefreshToken: encryptSecret(json.refresh_token),
      encryptedAccessToken: encryptSecret(json.access_token),
      accessTokenExpiresAt: new Date(Date.now() + (json.expires_in || 3600) * 1000),
      realmId: opts.realmId,
      connectedByAdminId: opts.connectedByAdminId || null,
      connectedByEmail: opts.connectedByEmail || null,
      metadataJson: JSON.stringify({
        itemIncomeId: process.env.QUICKBOOKS_ITEM_INCOME_ID || "",
        itemGratuityId: process.env.QUICKBOOKS_ITEM_GRATUITY_ID || "",
        itemHstId: process.env.QUICKBOOKS_ITEM_HST_ID || "",
      }),
    },
    update: {
      encryptedRefreshToken: encryptSecret(json.refresh_token),
      encryptedAccessToken: encryptSecret(json.access_token),
      accessTokenExpiresAt: new Date(Date.now() + (json.expires_in || 3600) * 1000),
      realmId: opts.realmId,
      connectedByAdminId: opts.connectedByAdminId || null,
      connectedByEmail: opts.connectedByEmail || null,
      connectedAt: new Date(),
    },
  });
}
