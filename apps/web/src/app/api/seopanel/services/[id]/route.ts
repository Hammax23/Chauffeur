import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth, getClientIP } from "@/lib/seo-auth";
import { sanitizeInput } from "@/lib/sanitize";
import { logSeoAudit } from "@/lib/seo-audit";
import { slugifyTitle } from "@/lib/blog";

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
    const existing = await prisma.managedService.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 });
    }

    const body = await request.json();
    const title = body.title != null ? sanitizeInput(String(body.title)).trim() : existing.title;
    const shortDesc = body.shortDesc != null ? sanitizeInput(String(body.shortDesc)).trim() : existing.shortDesc;
    const description = body.description != null ? sanitizeInput(String(body.description)).trim() : existing.description;
    let slug = body.slug != null ? slugifyTitle(sanitizeInput(String(body.slug)).trim()) : existing.slug;

    if (slug !== existing.slug) {
      const taken = await prisma.managedService.findFirst({ where: { slug, NOT: { id } } });
      if (taken) {
        return NextResponse.json({ success: false, error: "Slug already in use" }, { status: 400 });
      }
    }

    const features = Array.isArray(body.features)
      ? body.features.map((f: unknown) => sanitizeInput(String(f)).trim()).filter(Boolean)
      : Array.isArray(existing.features)
        ? (existing.features as string[])
        : [];

    const service = await prisma.managedService.update({
      where: { id },
      data: {
        title,
        slug,
        shortDesc,
        description,
        features,
        icon: body.icon != null ? sanitizeInput(String(body.icon)) : existing.icon,
        isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : existing.sortOrder,
      },
    });

    await logSeoAudit({
      action: "update",
      entityType: "service",
      entityId: service.id,
      entityLabel: service.title,
      ipAddress: getClientIP(request),
    });

    revalidatePath("/services");
    revalidatePath(`/services/${existing.slug}`);
    revalidatePath(`/services/${service.slug}`);

    return NextResponse.json({ success: true, service });
  } catch (error) {
    console.error("[SEO Services Update]", error);
    return NextResponse.json({ success: false, error: "Failed to update service" }, { status: 500 });
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
    const existing = await prisma.managedService.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 });
    }

    await prisma.managedService.delete({ where: { id } });

    await logSeoAudit({
      action: "delete",
      entityType: "service",
      entityId: id,
      entityLabel: existing.title,
      ipAddress: getClientIP(request),
    });

    revalidatePath("/services");
    revalidatePath(`/services/${existing.slug}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SEO Services Delete]", error);
    return NextResponse.json({ success: false, error: "Failed to delete service" }, { status: 500 });
  }
}
