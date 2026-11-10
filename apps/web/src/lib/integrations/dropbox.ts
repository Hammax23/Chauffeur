import "server-only";
import prisma from "@/lib/prisma";
import { decryptSecret, encryptSecret, isEncryptionConfigured } from "@/lib/secure-token-crypto";
import {
  assertIntegrationEnvironmentAllowed,
  dropboxInvoiceRoot,
  dropboxJoinPath,
} from "@/lib/integrations/env-guard";
import { invoicePdfFileName } from "@/lib/invoice-pdf";

type SyncResult = {
  status: "DONE" | "FAILED" | "SKIPPED";
  path?: string;
  error?: string;
};

function dropboxConfigured(): boolean {
  return Boolean(
    process.env.DROPBOX_APP_KEY?.trim() &&
      process.env.DROPBOX_APP_SECRET?.trim() &&
      isEncryptionConfigured()
  );
}

async function refreshDropboxToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.DROPBOX_APP_KEY!.trim(),
      client_secret: process.env.DROPBOX_APP_SECRET!.trim(),
    }),
  });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error || `Dropbox token refresh failed (${res.status})`);
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in || 14400 };
}

export async function syncInvoiceToDropbox(
  invoiceId: string,
  pdfBuffer: Buffer
): Promise<SyncResult> {
  try {
    if (!dropboxConfigured()) {
      return { status: "SKIPPED", error: "Dropbox env not configured" };
    }
    assertIntegrationEnvironmentAllowed("DROPBOX");

    const cred = await prisma.integrationCredential.findUnique({
      where: { provider: "DROPBOX" },
    });
    if (!cred?.encryptedRefreshToken) {
      return { status: "SKIPPED", error: "Dropbox not connected by owner" };
    }

    const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    if (inv.dropboxPath) return { status: "DONE", path: inv.dropboxPath };

    let accessToken = cred.encryptedAccessToken
      ? decryptSecret(cred.encryptedAccessToken)
      : "";
    const refreshToken = decryptSecret(cred.encryptedRefreshToken);
    const expired =
      !cred.accessTokenExpiresAt || cred.accessTokenExpiresAt.getTime() < Date.now() + 60_000;
    if (!accessToken || expired) {
      const tokens = await refreshDropboxToken(refreshToken);
      accessToken = tokens.accessToken;
      await prisma.integrationCredential.update({
        where: { provider: "DROPBOX" },
        data: {
          encryptedAccessToken: encryptSecret(tokens.accessToken),
          accessTokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        },
      });
    }

    const issued = inv.createdAt;
    const y = issued.getUTCFullYear();
    const m = String(issued.getUTCMonth() + 1).padStart(2, "0");
    // App-folder apps: paths are relative to Apps/<AppName>/ only.
    const root = (cred.folderPath || dropboxInvoiceRoot() || "").trim();
    const path = dropboxJoinPath(
      root,
      String(y),
      m,
      invoicePdfFileName(inv.invoiceNumber)
    );

    const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path,
          mode: "add",
          autorename: true,
          mute: true,
          strict_conflict: false,
        }),
      },
      body: new Uint8Array(pdfBuffer),
    });
    const json = (await res.json().catch(() => ({}))) as {
      path_display?: string;
      error_summary?: string;
    };
    if (!res.ok) {
      return {
        status: "FAILED",
        error: json.error_summary || `Dropbox upload ${res.status}`,
      };
    }
    return { status: "DONE", path: json.path_display || path };
  } catch (e: unknown) {
    return {
      status: "FAILED",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function getDropboxAuthorizeUrl(state: string): string {
  const key = process.env.DROPBOX_APP_KEY?.trim();
  const redirect = process.env.DROPBOX_REDIRECT_URI?.trim();
  if (!key || !redirect) throw new Error("DROPBOX_APP_KEY / DROPBOX_REDIRECT_URI missing");
  const args = new URLSearchParams({
    client_id: key,
    response_type: "code",
    token_access_type: "offline",
    redirect_uri: redirect,
    state,
  });
  return `https://www.dropbox.com/oauth2/authorize?${args.toString()}`;
}

export async function exchangeDropboxCode(opts: {
  code: string;
  connectedByAdminId?: string | null;
  connectedByEmail?: string | null;
}): Promise<void> {
  if (!isEncryptionConfigured()) {
    throw new Error("INTEGRATION_TOKEN_ENCRYPTION_KEY required");
  }
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: opts.code,
      grant_type: "authorization_code",
      client_id: process.env.DROPBOX_APP_KEY!.trim(),
      client_secret: process.env.DROPBOX_APP_SECRET!.trim(),
      redirect_uri: process.env.DROPBOX_REDIRECT_URI!.trim(),
    }),
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    account_id?: string;
    error?: string;
  };
  if (!res.ok || !json.refresh_token || !json.access_token) {
    throw new Error(json.error || "Dropbox OAuth exchange failed");
  }

  await prisma.integrationCredential.upsert({
    where: { provider: "DROPBOX" },
    create: {
      provider: "DROPBOX",
      encryptedRefreshToken: encryptSecret(json.refresh_token),
      encryptedAccessToken: encryptSecret(json.access_token),
      accessTokenExpiresAt: new Date(Date.now() + (json.expires_in || 14400) * 1000),
      accountId: json.account_id || null,
      folderPath: dropboxInvoiceRoot() || "/",
      connectedByAdminId: opts.connectedByAdminId || null,
      connectedByEmail: opts.connectedByEmail || null,
    },
    update: {
      encryptedRefreshToken: encryptSecret(json.refresh_token),
      encryptedAccessToken: encryptSecret(json.access_token),
      accessTokenExpiresAt: new Date(Date.now() + (json.expires_in || 14400) * 1000),
      accountId: json.account_id || null,
      folderPath: dropboxInvoiceRoot() || "/",
      connectedByAdminId: opts.connectedByAdminId || null,
      connectedByEmail: opts.connectedByEmail || null,
      connectedAt: new Date(),
    },
  });
}
