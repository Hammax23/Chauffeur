import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { requireOwnerAdmin, requireBillingAdmin } from "@/lib/admin-rbac";
import { isEncryptionConfigured } from "@/lib/secure-token-crypto";
import { getQuickBooksAuthorizeUrl } from "@/lib/integrations/quickbooks";
import { getDropboxAuthorizeUrl } from "@/lib/integrations/dropbox";

/** GET — connection status (no secrets). Billing assistant can view; only owner can connect. */
export async function GET(req: NextRequest) {
  const gate = await requireBillingAdmin(req);
  if (!gate.ok) return gate.response;

  const rows = await prisma.integrationCredential.findMany({
    select: {
      provider: true,
      realmId: true,
      accountId: true,
      folderPath: true,
      connectedAt: true,
      connectedByEmail: true,
      updatedAt: true,
    },
  });

  const byProvider = Object.fromEntries(rows.map((r) => [r.provider, r]));

  return NextResponse.json({
    success: true,
    role: gate.auth.role,
    encryptionConfigured: isEncryptionConfigured(),
    quickbooks: {
      connected: Boolean(byProvider.QUICKBOOKS),
      realmId: byProvider.QUICKBOOKS?.realmId || null,
      connectedAt: byProvider.QUICKBOOKS?.connectedAt?.toISOString() || null,
      connectedByEmail: byProvider.QUICKBOOKS?.connectedByEmail || null,
      envReady: Boolean(
        process.env.QUICKBOOKS_CLIENT_ID?.trim() &&
          process.env.QUICKBOOKS_CLIENT_SECRET?.trim() &&
          process.env.QUICKBOOKS_REDIRECT_URI?.trim()
      ),
    },
    dropbox: {
      connected: Boolean(byProvider.DROPBOX),
      folderPath: byProvider.DROPBOX?.folderPath || null,
      connectedAt: byProvider.DROPBOX?.connectedAt?.toISOString() || null,
      connectedByEmail: byProvider.DROPBOX?.connectedByEmail || null,
      envReady: Boolean(
        process.env.DROPBOX_APP_KEY?.trim() &&
          process.env.DROPBOX_APP_SECRET?.trim() &&
          process.env.DROPBOX_REDIRECT_URI?.trim()
      ),
    },
    billingHstNumberSet: Boolean(process.env.BILLING_HST_NUMBER?.trim()),
  });
}

/** POST — owner-only: start OAuth or disconnect */
export async function POST(req: NextRequest) {
  const gate = await requireOwnerAdmin(req);
  if (!gate.ok) return gate.response;

  if (!isEncryptionConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: "Set INTEGRATION_TOKEN_ENCRYPTION_KEY before connecting integrations.",
      },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const provider = String(body.provider || "").toUpperCase();

  if (action === "disconnect") {
    if (provider !== "QUICKBOOKS" && provider !== "DROPBOX") {
      return NextResponse.json({ success: false, error: "Invalid provider" }, { status: 400 });
    }
    await prisma.integrationCredential.deleteMany({ where: { provider } });
    await prisma.billingAuditLog.create({
      data: {
        actor: gate.auth.actor,
        adminId: gate.auth.adminId,
        action: "INTEGRATION_DISCONNECT",
        metaJson: JSON.stringify({ provider }),
      },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "connect") {
    const state = crypto.randomBytes(16).toString("hex");
    // Store short-lived state in audit meta is weak; use cookie
    const res =
      provider === "QUICKBOOKS"
        ? NextResponse.json({
            success: true,
            url: getQuickBooksAuthorizeUrl(state),
          })
        : provider === "DROPBOX"
          ? NextResponse.json({
              success: true,
              url: getDropboxAuthorizeUrl(state),
            })
          : NextResponse.json({ success: false, error: "Invalid provider" }, { status: 400 });

    if (res.status === 200) {
      // Lax so cookies survive return from Dropbox/Intuit (admin JWT is SameSite=Strict).
      const oauthCookie = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: 600,
        path: "/",
      };
      res.cookies.set("sarj_oauth_state", state, oauthCookie);
      res.cookies.set(
        "sarj_oauth_actor",
        JSON.stringify({
          adminId: gate.auth.adminId,
          email: gate.auth.email,
          actor: gate.auth.actor,
        }),
        oauthCookie
      );
    }
    return res;
  }

  return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
}
