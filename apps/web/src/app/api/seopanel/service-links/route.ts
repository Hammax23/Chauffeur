import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth, getClientIP } from "@/lib/seo-auth";
import { sanitizeInput, sanitizeUrl } from "@/lib/sanitize";
import { logSeoAudit } from "@/lib/seo-audit";

export async function GET(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const serviceSlug = new URL(request.url).searchParams.get("serviceSlug") || undefined;
  const links = await prisma.serviceLink.findMany({
    where: serviceSlug ? { serviceSlug } : undefined,
    orderBy: [{ serviceSlug: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ success: true, links });
}

export async function POST(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const serviceSlug = sanitizeInput(String(body.serviceSlug || "")).trim();
    const label = sanitizeInput(String(body.label || "")).trim().slice(0, 200);
    const url = sanitizeUrl(body.url);

    if (!serviceSlug || !label || !url) {
      return NextResponse.json(
        { success: false, error: "Service, link text and a valid URL (starting with / or https://) are required" },
        { status: 400 }
      );
    }

    const count = await prisma.serviceLink.count({ where: { serviceSlug } });
    const link = await prisma.serviceLink.create({
      data: {
        serviceSlug,
        label,
        url,
        isActive: body.isActive !== false,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : count,
      },
    });

    await logSeoAudit({
      action: "create",
      entityType: "service-link",
      entityId: link.id,
      entityLabel: `${serviceSlug}: ${label}`,
      ipAddress: getClientIP(request),
    });
    revalidatePath(`/services/${serviceSlug}`);
    return NextResponse.json({ success: true, link });
  } catch (error) {
    console.error("[SEO Service Link Create]", error);
    return NextResponse.json({ success: false, error: "Failed to create link" }, { status: 500 });
  }
}
