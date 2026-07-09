import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth, getClientIP } from "@/lib/seo-auth";
import { sanitizeInput } from "@/lib/sanitize";
import { logSeoAudit } from "@/lib/seo-audit";
import { getAllCities, seedCitiesFromStatic } from "@/lib/managed-cities";
import { slugifyTitle } from "@/lib/blog";

export async function GET(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const cities = await getAllCities(true);
  return NextResponse.json({ success: true, cities, total: cities.length });
}

export async function POST(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.action === "seed") {
      const result = await seedCitiesFromStatic();
      await logSeoAudit({
        action: "seed",
        entityType: "city",
        entityLabel: "Import from static data",
        details: result,
        ipAddress: getClientIP(request),
      });
      revalidatePath("/cities-we-serve");
      return NextResponse.json({ success: true, ...result });
    }

    const label = sanitizeInput(String(body.label || "")).trim();
    let slug = sanitizeInput(String(body.slug || "")).trim() || slugifyTitle(label);
    slug = slugifyTitle(slug);

    if (!label || !slug) {
      return NextResponse.json({ success: false, error: "Label and slug are required" }, { status: 400 });
    }

    const existing = await prisma.managedCity.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Slug already exists" }, { status: 400 });
    }

    const city = await prisma.managedCity.create({
      data: {
        label,
        slug,
        description: body.description ? sanitizeInput(String(body.description)) : null,
        isActive: body.isActive !== false,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      },
    });

    await logSeoAudit({
      action: "create",
      entityType: "city",
      entityId: city.id,
      entityLabel: city.label,
      ipAddress: getClientIP(request),
    });

    revalidatePath("/cities-we-serve");
    revalidatePath(`/cities-we-serve/${city.slug}`);

    return NextResponse.json({ success: true, city });
  } catch (error) {
    console.error("[SEO Cities Create]", error);
    return NextResponse.json({ success: false, error: "Failed to create city" }, { status: 500 });
  }
}
