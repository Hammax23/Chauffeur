import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth, getClientIP } from "@/lib/seo-auth";
import { sanitizeInput, sanitizeUrl } from "@/lib/sanitize";
import { logSeoAudit } from "@/lib/seo-audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await prisma.serviceLink.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Link not found" }, { status: 404 });
    }
    const body = await request.json();
    const label = body.label != null ? sanitizeInput(String(body.label)).trim().slice(0, 200) : existing.label;
    const url = body.url != null ? sanitizeUrl(body.url) : existing.url;
    if (!label || !url) {
      return NextResponse.json({ success: false, error: "Link text and a valid URL are required" }, { status: 400 });
    }
    const link = await prisma.serviceLink.update({
      where: { id },
      data: {
        label,
        url,
        isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : existing.sortOrder,
      },
    });
    await logSeoAudit({
      action: "update",
      entityType: "service-link",
      entityId: id,
      entityLabel: `${link.serviceSlug}: ${link.label}`,
      ipAddress: getClientIP(request),
    });
    revalidatePath(`/services/${link.serviceSlug}`);
    return NextResponse.json({ success: true, link });
  } catch (error) {
    console.error("[SEO Service Link Update]", error);
    return NextResponse.json({ success: false, error: "Failed to update link" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await prisma.serviceLink.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Link not found" }, { status: 404 });
    }
    await prisma.serviceLink.delete({ where: { id } });
    await logSeoAudit({
      action: "delete",
      entityType: "service-link",
      entityId: id,
      entityLabel: `${existing.serviceSlug}: ${existing.label}`,
      ipAddress: getClientIP(request),
    });
    revalidatePath(`/services/${existing.serviceSlug}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SEO Service Link Delete]", error);
    return NextResponse.json({ success: false, error: "Failed to delete link" }, { status: 500 });
  }
}
