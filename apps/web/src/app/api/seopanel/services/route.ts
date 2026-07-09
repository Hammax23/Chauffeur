import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth, getClientIP } from "@/lib/seo-auth";
import { sanitizeInput } from "@/lib/sanitize";
import { logSeoAudit } from "@/lib/seo-audit";
import { getAllServices, seedServicesFromStatic, SERVICE_ICON_OPTIONS } from "@/lib/managed-services";
import { slugifyTitle } from "@/lib/blog";

export async function GET(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const services = await getAllServices(true);
  return NextResponse.json({
    success: true,
    services,
    icons: SERVICE_ICON_OPTIONS,
    total: services.length,
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.action === "seed") {
      const result = await seedServicesFromStatic();
      await logSeoAudit({
        action: "seed",
        entityType: "service",
        entityLabel: "Import from static data",
        details: result,
        ipAddress: getClientIP(request),
      });
      revalidatePath("/services");
      return NextResponse.json({ success: true, ...result });
    }

    const title = sanitizeInput(String(body.title || "")).trim();
    const shortDesc = sanitizeInput(String(body.shortDesc || "")).trim();
    const description = sanitizeInput(String(body.description || "")).trim();
    let slug = sanitizeInput(String(body.slug || "")).trim() || slugifyTitle(title);
    slug = slugifyTitle(slug);
    const features = Array.isArray(body.features)
      ? body.features.map((f: unknown) => sanitizeInput(String(f)).trim()).filter(Boolean)
      : [];
    const icon = sanitizeInput(String(body.icon || "Car"));

    if (!title || !shortDesc || !description || !slug) {
      return NextResponse.json({ success: false, error: "Title, slug, short description, and description are required" }, { status: 400 });
    }

    const existing = await prisma.managedService.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Slug already exists" }, { status: 400 });
    }

    const service = await prisma.managedService.create({
      data: {
        slug,
        title,
        shortDesc,
        description,
        features,
        icon,
        isActive: body.isActive !== false,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      },
    });

    await logSeoAudit({
      action: "create",
      entityType: "service",
      entityId: service.id,
      entityLabel: service.title,
      ipAddress: getClientIP(request),
    });

    revalidatePath("/services");
    revalidatePath(`/services/${service.slug}`);

    return NextResponse.json({ success: true, service });
  } catch (error) {
    console.error("[SEO Services Create]", error);
    return NextResponse.json({ success: false, error: "Failed to create service" }, { status: 500 });
  }
}
