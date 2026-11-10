import "server-only";

/** Prevent staging/dev from writing into production QuickBooks / Dropbox. */
export function assertIntegrationEnvironmentAllowed(provider: "QUICKBOOKS" | "DROPBOX"): void {
  const appEnv = (process.env.APP_ENV || process.env.NODE_ENV || "development").toLowerCase();
  const isProd = appEnv === "production" || appEnv === "prod";

  if (provider === "QUICKBOOKS") {
    const pinned = process.env.QUICKBOOKS_REALM_ID?.trim();
    const allowNonProd = process.env.QUICKBOOKS_ALLOW_NON_PROD === "true";
    if (!isProd && !allowNonProd) {
      throw new Error(
        "QuickBooks sync blocked outside production (set QUICKBOOKS_ALLOW_NON_PROD=true for sandbox only)."
      );
    }
    if (pinned && process.env.QUICKBOOKS_CONNECTED_REALM_ID) {
      const connected = process.env.QUICKBOOKS_CONNECTED_REALM_ID.trim();
      if (connected && connected !== pinned) {
        throw new Error("QuickBooks realmId mismatch — refusing sync (staging/prod isolation).");
      }
    }
  }

  if (provider === "DROPBOX") {
    const allowNonProd = process.env.DROPBOX_ALLOW_NON_PROD === "true";
    if (!isProd && !allowNonProd) {
      throw new Error(
        "Dropbox sync blocked outside production (set DROPBOX_ALLOW_NON_PROD=true for test folder only)."
      );
    }
  }
}

/**
 * Root inside the Dropbox app folder (Scoped access → App folder).
 * Default empty = save directly under "Apps/<App Name>/" as /YYYY/MM/*.pdf
 * so other Dropbox folders are never touched.
 */
export function dropboxInvoiceRoot(): string {
  const raw = process.env.DROPBOX_INVOICES_ROOT?.trim();
  if (!raw || raw === "/") return "";
  return raw.replace(/\/$/, "");
}

/** Join Dropbox API paths without double slashes. */
export function dropboxJoinPath(...parts: string[]): string {
  const cleaned = parts
    .map((p) => String(p || "").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
  return `/${cleaned.join("/")}`;
}
