import { NextRequest, NextResponse } from "next/server";
import { requireOwnerAdmin } from "@/lib/admin-rbac";
import { exchangeDropboxCode } from "@/lib/integrations/dropbox";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const gate = await requireOwnerAdmin(req);
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const cookieState = req.cookies.get("sarj_oauth_state")?.value || "";

  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(
      new URL("/admin/billing?oauth=dropbox_failed", req.url)
    );
  }

  try {
    await exchangeDropboxCode({
      code,
      connectedByAdminId: gate.auth.adminId,
      connectedByEmail: gate.auth.email,
    });
    await prisma.billingAuditLog.create({
      data: {
        actor: gate.auth.actor,
        adminId: gate.auth.adminId,
        action: "DROPBOX_CONNECTED",
      },
    });
  } catch (e) {
    console.error("[dropbox oauth callback]", e);
    return NextResponse.redirect(
      new URL("/admin/billing?oauth=dropbox_failed", req.url)
    );
  }

  const res = NextResponse.redirect(
    new URL("/admin/billing?oauth=dropbox_ok", req.url)
  );
  res.cookies.set("sarj_oauth_state", "", { maxAge: 0, path: "/" });
  return res;
}
