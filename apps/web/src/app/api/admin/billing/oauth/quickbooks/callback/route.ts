import { NextRequest, NextResponse } from "next/server";
import { exchangeQuickBooksCode } from "@/lib/integrations/quickbooks";
import { oauthRedirect } from "@/lib/integrations/oauth-redirect";
import prisma from "@/lib/prisma";

/** SameSite=Strict admin JWT is missing on return from Intuit — use Lax oauth cookies. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const realmId = url.searchParams.get("realmId") || "";
  const state = url.searchParams.get("state") || "";
  const cookieState = req.cookies.get("sarj_oauth_state")?.value || "";
  const actorRaw = req.cookies.get("sarj_oauth_actor")?.value || "";

  const fail = () =>
    NextResponse.redirect(oauthRedirect(req, "/admin/billing?oauth=qb_failed"));

  if (!code || !realmId || !state || !cookieState || state !== cookieState) {
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
    await exchangeQuickBooksCode({
      code,
      realmId,
      connectedByAdminId: adminId,
      connectedByEmail: email,
    });
    await prisma.billingAuditLog.create({
      data: {
        actor,
        adminId,
        action: "QUICKBOOKS_CONNECTED",
        metaJson: JSON.stringify({ realmId }),
      },
    });
  } catch (e) {
    console.error("[qb oauth callback]", e);
    return fail();
  }

  const res = NextResponse.redirect(
    oauthRedirect(req, "/admin/billing?oauth=qb_ok")
  );
  res.cookies.set("sarj_oauth_state", "", { maxAge: 0, path: "/" });
  res.cookies.set("sarj_oauth_actor", "", { maxAge: 0, path: "/" });
  return res;
}
