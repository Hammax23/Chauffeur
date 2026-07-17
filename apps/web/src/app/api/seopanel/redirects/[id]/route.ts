import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth, getClientIP } from "@/lib/seo-auth";
import { normalizeSeoPath } from "@/lib/seo-pages";
import { sanitizeInput, sanitizeUrl } from "@/lib/sanitize";
import { logSeoAudit } from "@/lib/seo-audit";

function sanitizeDestination(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http")) {
    return sanitizeUrl(trimmed);
  }
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return normalizeSeoPath(sanitizeUrl(path) || path);
}

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
    const body = await request.json();

    const redirect = await prisma.seoRedirect.update({
      where: { id },
      data: {
        ...(body.sourcePath && {
          sourcePath: normalizeSeoPath(sanitizeInput(body.sourcePath)),
        }),
        ...(body.destinationPath && {
          destinationPath: sanitizeDestination(String(body.destinationPath)),
        }),
        ...(body.redirectType && { redirectType: body.redirectType === 302 ? 302 : 301 }),
        ...(typeof body.isActive === "boolean" && { isActive: body.isActive }),
        ...(body.notes !== undefined && {
          notes: body.notes ? sanitizeInput(String(body.notes)) : null,
        }),
      },
    });

    revalidatePath("/", "layout");

    await logSeoAudit({
      action: "update",
      entityType: "redirect",
      entityId: redirect.id,
      entityLabel: `${redirect.sourcePath} → ${redirect.destinationPath}`,
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, redirect });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update redirect" }, { status: 500 });
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
    const existing = await prisma.seoRedirect.findUnique({ where: { id } });
    await prisma.seoRedirect.delete({ where: { id } });

    revalidatePath("/", "layout");

    await logSeoAudit({
      action: "delete",
      entityType: "redirect",
      entityId: id,
      entityLabel: existing ? `${existing.sourcePath} → ${existing.destinationPath}` : id,
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete redirect" }, { status: 500 });
  }
}
