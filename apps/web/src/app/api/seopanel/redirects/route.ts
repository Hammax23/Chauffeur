import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth } from "@/lib/seo-auth";
import { normalizeSeoPath } from "@/lib/seo-pages";
import { sanitizeInput } from "@/lib/sanitize";

export async function GET(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const redirects = await prisma.seoRedirect.findMany({
    orderBy: { createdAt: "desc" },
  }).catch(() => []);

  return NextResponse.json({ success: true, redirects });
}

export async function POST(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const sourcePath = normalizeSeoPath(sanitizeInput(body.sourcePath || ""));
    const destinationPath = sanitizeInput(body.destinationPath || "").trim();
    const redirectType = body.redirectType === 302 ? 302 : 301;

    if (!sourcePath || !destinationPath) {
      return NextResponse.json({ success: false, error: "Source and destination required" }, { status: 400 });
    }

    const redirect = await prisma.seoRedirect.create({
      data: {
        sourcePath,
        destinationPath: destinationPath.startsWith("http") ? destinationPath : normalizeSeoPath(destinationPath),
        redirectType,
        notes: body.notes ? sanitizeInput(String(body.notes)) : null,
      },
    });

    return NextResponse.json({ success: true, redirect });
  } catch (error) {
    console.error("[SEO Redirect Create]", error);
    return NextResponse.json({ success: false, error: "Failed to create redirect" }, { status: 500 });
  }
}
