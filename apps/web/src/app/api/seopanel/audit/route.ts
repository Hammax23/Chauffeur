import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth } from "@/lib/seo-auth";

export async function GET(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const entityType = searchParams.get("entityType") ?? "";

  try {
    const logs = await prisma.seoAuditLog.findMany({
      where: entityType ? { entityType } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, logs, total: logs.length });
  } catch (error) {
    console.error("[SEO Audit]", error);
    return NextResponse.json({ success: false, error: "Failed to load audit log", logs: [] });
  }
}
