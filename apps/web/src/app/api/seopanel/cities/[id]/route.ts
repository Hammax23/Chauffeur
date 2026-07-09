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
    const existing = await prisma.managedCity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "City not found" }, { status: 404 });
    }

    const body = await request.json();
    const label = body.label != null ? sanitizeInput(String(body.label)).trim() : existing.label;
    let slug = body.slug != null ? slugifyTitle(sanitizeInput(String(body.slug)).trim()) : existing.slug;

    if (slug !== existing.slug) {
      const taken = await prisma.managedCity.findFirst({ where: { slug, NOT: { id } } });
      if (taken) {
        return NextResponse.json({ success: false, error: "Slug already in use" }, { status: 400 });
      }
    }

    const city = await prisma.managedCity.update({
      where: { id },
      data: {
        label,
        slug,
        description: body.description != null ? sanitizeInput(String(body.description)) : existing.description,
        isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : existing.sortOrder,
      },
    });

    await logSeoAudit({
      action: "update",
      entityType: "city",
      entityId: city.id,
      entityLabel: city.label,
      ipAddress: getClientIP(request),
    });

    revalidatePath("/cities-we-serve");
    revalidatePath(`/cities-we-serve/${existing.slug}`);
    revalidatePath(`/cities-we-serve/${city.slug}`);

    return NextResponse.json({ success: true, city });
  } catch (error) {
    console.error("[SEO Cities Update]", error);
    return NextResponse.json({ success: false, error: "Failed to update city" }, { status: 500 });
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
    const existing = await prisma.managedCity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "City not found" }, { status: 404 });
    }

    await prisma.managedCity.delete({ where: { id } });

    await logSeoAudit({
      action: "delete",
      entityType: "city",
      entityId: id,
      entityLabel: existing.label,
      ipAddress: getClientIP(request),
    });

    revalidatePath("/cities-we-serve");
    revalidatePath(`/cities-we-serve/${existing.slug}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SEO Cities Delete]", error);
    return NextResponse.json({ success: false, error: "Failed to delete city" }, { status: 500 });
  }
}
