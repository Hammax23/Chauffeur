import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth, getClientIP } from "@/lib/seo-auth";
import { normalizeSeoPath } from "@/lib/seo-pages";
import { sanitizePlainText, sanitizeUrl } from "@/lib/sanitize";
import { logSeoAudit } from "@/lib/seo-audit";

function sanitizeDestination(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http")) {
    return sanitizeUrl(trimmed);
  }
  return normalizeSeoPath(sanitizeUrl(trimmed.startsWith("/") ? trimmed : `/${trimmed}`) || trimmed);
}

export async function GET(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const redirects = await prisma.seoRedirect
    .findMany({
      orderBy: { createdAt: "desc" },
    })
    .catch(() => []);

  return NextResponse.json({ success: true, redirects });
}

export async function POST(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const sourcePath = normalizeSeoPath(sanitizePlainText(body.sourcePath || "", 500));
    const destinationPath = sanitizeDestination(String(body.destinationPath || ""));
    const redirectType = body.redirectType === 302 ? 302 : 301;

    if (!sourcePath || !destinationPath) {
      return NextResponse.json(
        { success: false, error: "Source and destination required" },
        { status: 400 }
      );
    }

    const redirect = await prisma.seoRedirect.create({
      data: {
        sourcePath,
        destinationPath,
        redirectType,
        notes: body.notes ? sanitizePlainText(String(body.notes), 2000) : null,
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/api/seo-redirects");

    await logSeoAudit({
      action: "create",
      entityType: "redirect",
      entityId: redirect.id,
      entityLabel: `${sourcePath} → ${destinationPath}`,
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, redirect });
  } catch (error) {
    console.error("[SEO Redirect Create]", error);
    return NextResponse.json({ success: false, error: "Failed to create redirect" }, { status: 500 });
  }
}
