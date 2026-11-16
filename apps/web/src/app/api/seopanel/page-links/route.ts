import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth, getClientIP } from "@/lib/seo-auth";
import { sanitizeInput, sanitizeUrl } from "@/lib/sanitize";
import { logSeoAudit } from "@/lib/seo-audit";
import { normalizePagePath, PAGE_LINKS_TAG } from "@/lib/page-links";

export async function GET(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const path = new URL(request.url).searchParams.get("path");
  const links = await prisma.pageLink.findMany({
    where: path ? { pagePath: normalizePagePath(path) } : undefined,
    orderBy: [{ pagePath: "asc" }, { createdAt: "asc" }],
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
    const pagePath = normalizePagePath(String(body.pagePath || ""));
    const phrase = sanitizeInput(String(body.phrase || "")).trim().replace(/\s+/g, " ").slice(0, 200);
    const url = sanitizeUrl(body.url);
    const kind = body.kind === "edit" ? "edit" : "text";
    const removeLink = kind === "edit" && body.removeLink === true;
    const newText = kind === "edit" ? sanitizeInput(String(body.newText || "")).trim().slice(0, 200) || null : null;
    const occurrence = Number.isInteger(body.occurrence) && body.occurrence >= 1 ? body.occurrence : 1;

    if (!body.pagePath || !phrase || (!url && !removeLink)) {
      return NextResponse.json(
        { success: false, error: "Page, word/phrase and a valid URL (starting with / or https://) are required" },
        { status: 400 }
      );
    }

    const link = await prisma.pageLink.create({
      data: { pagePath, phrase, url, occurrence, kind, removeLink, newText, newTab: body.newTab === true, isActive: body.isActive !== false },
    });
    await logSeoAudit({
      action: "create",
      entityType: "page-link",
      entityId: link.id,
      entityLabel: `${pagePath}: ${phrase}`,
      ipAddress: getClientIP(request),
    });
    revalidateTag(PAGE_LINKS_TAG);
    revalidatePath(pagePath);
    return NextResponse.json({ success: true, link });
  } catch (error) {
    console.error("[SEO Page Link Create]", error);
    return NextResponse.json({ success: false, error: "Failed to create link" }, { status: 500 });
  }
}
