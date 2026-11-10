import { NextRequest, NextResponse } from "next/server";
import { requireOwnerAdmin } from "@/lib/admin-rbac";
import { exchangeQuickBooksCode } from "@/lib/integrations/quickbooks";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const gate = await requireOwnerAdmin(req);
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const realmId = url.searchParams.get("realmId") || "";
  const state = url.searchParams.get("state") || "";
  const cookieState = req.cookies.get("sarj_oauth_state")?.value || "";

  if (!code || !realmId || !state || state !== cookieState) {
    return NextResponse.redirect(
      new URL("/admin/billing?oauth=qb_failed", req.url)
    );
  }

  try {
    await exchangeQuickBooksCode({
      code,
      realmId,
      connectedByAdminId: gate.auth.adminId,
      connectedByEmail: gate.auth.email,
    });
    await prisma.billingAuditLog.create({
      data: {
        actor: gate.auth.actor,
        adminId: gate.auth.adminId,
        action: "QUICKBOOKS_CONNECTED",
        metaJson: JSON.stringify({ realmId }),
      },
    });
  } catch (e) {
    console.error("[qb oauth callback]", e);
    return NextResponse.redirect(
      new URL("/admin/billing?oauth=qb_failed", req.url)
    );
  }

  const res = NextResponse.redirect(
    new URL("/admin/billing?oauth=qb_ok", req.url)
  );
  res.cookies.set("sarj_oauth_state", "", { maxAge: 0, path: "/" });
  return res;
}
