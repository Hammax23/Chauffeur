import { NextRequest, NextResponse } from "next/server";
import { exchangeDropboxCode } from "@/lib/integrations/dropbox";
import { oauthRedirect } from "@/lib/integrations/oauth-redirect";
import prisma from "@/lib/prisma";

/**
 * Dropbox returns here via top-level redirect. Admin JWT cookie is SameSite=Strict
 * so it is NOT sent. We authorize this step via Lax oauth state + actor cookies
 * that were set only after Owner passed requireOwnerAdmin on /connect.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const cookieState = req.cookies.get("sarj_oauth_state")?.value || "";
  const actorRaw = req.cookies.get("sarj_oauth_actor")?.value || "";

  const fail = () =>
    NextResponse.redirect(oauthRedirect(req, "/admin/billing?oauth=dropbox_failed"));

  if (!code || !state || !cookieState || state !== cookieState) {
    return fail();
  }

  let adminId: string | null = null;
  let email: string | null = null;
  let actor = "owner-oauth";
  try {
    const parsed = JSON.parse(actorRaw) as {
      adminId?: string | null;
      email?: string | null;
      actor?: string;
    };
    adminId = parsed.adminId || null;
    email = parsed.email || null;
    actor = parsed.actor || email || adminId || actor;
  } catch {
    return fail();
  }

  try {
    await exchangeDropboxCode({
      code,
      connectedByAdminId: adminId,
      connectedByEmail: email,
    });
    await prisma.billingAuditLog.create({
      data: {
        actor,
        adminId,
        action: "DROPBOX_CONNECTED",
      },
    });
  } catch (e) {
    console.error("[dropbox oauth callback]", e);
    return fail();
  }

  const res = NextResponse.redirect(
    oauthRedirect(req, "/admin/billing?oauth=dropbox_ok")
  );
  res.cookies.set("sarj_oauth_state", "", { maxAge: 0, path: "/" });
  res.cookies.set("sarj_oauth_actor", "", { maxAge: 0, path: "/" });
  return res;
}
