import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth, getClientIP } from "@/lib/seo-auth";
import { sanitizeInput, sanitizeUrl } from "@/lib/sanitize";
import { logSeoAudit } from "@/lib/seo-audit";
import { PAGE_LINKS_TAG } from "@/lib/page-links";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await prisma.pageLink.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Link not found" }, { status: 404 });
    }
    const body = await request.json();
    const phrase =
      body.phrase != null ? sanitizeInput(String(body.phrase)).trim().replace(/\s+/g, " ").slice(0, 200) : existing.phrase;
    const url = body.url != null ? sanitizeUrl(body.url) : existing.url;
    const removeLink = typeof body.removeLink === "boolean" ? body.removeLink : existing.removeLink;
    const newText =
      body.newText !== undefined ? sanitizeInput(String(body.newText || "")).trim().slice(0, 200) || null : existing.newText;
    if (!phrase || (!url && !(existing.kind === "edit" && removeLink))) {
      return NextResponse.json({ success: false, error: "Word/phrase and a valid URL are required" }, { status: 400 });
    }
    const link = await prisma.pageLink.update({
      where: { id },
      data: {
        phrase,
        url,
        occurrence: Number.isInteger(body.occurrence) && body.occurrence >= 1 ? body.occurrence : existing.occurrence,
        removeLink,
        newText,
        newTab: typeof body.newTab === "boolean" ? body.newTab : existing.newTab,
        isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
      },
    });
    await logSeoAudit({
      action: "update",
      entityType: "page-link",
      entityId: id,
      entityLabel: `${link.pagePath}: ${link.phrase}`,
      ipAddress: getClientIP(request),
    });
    revalidateTag(PAGE_LINKS_TAG);
    revalidatePath(link.pagePath);
    return NextResponse.json({ success: true, link });
  } catch (error) {
    console.error("[SEO Page Link Update]", error);
    return NextResponse.json({ success: false, error: "Failed to update link" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await prisma.pageLink.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Link not found" }, { status: 404 });
    }
    await prisma.pageLink.delete({ where: { id } });
    await logSeoAudit({
      action: "delete",
      entityType: "page-link",
      entityId: id,
      entityLabel: `${existing.pagePath}: ${existing.phrase}`,
      ipAddress: getClientIP(request),
    });
    revalidateTag(PAGE_LINKS_TAG);
    revalidatePath(existing.pagePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SEO Page Link Delete]", error);
    return NextResponse.json({ success: false, error: "Failed to delete link" }, { status: 500 });
  }
}
