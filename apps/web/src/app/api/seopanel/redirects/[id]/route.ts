import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySeoPanelAuth } from "@/lib/seo-auth";
import { normalizeSeoPath } from "@/lib/seo-pages";
import { sanitizeInput } from "@/lib/sanitize";

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
        ...(body.sourcePath && { sourcePath: normalizeSeoPath(sanitizeInput(body.sourcePath)) }),
        ...(body.destinationPath && {
          destinationPath: String(body.destinationPath).startsWith("http")
            ? sanitizeInput(body.destinationPath)
            : normalizeSeoPath(sanitizeInput(body.destinationPath)),
        }),
        ...(body.redirectType && { redirectType: body.redirectType === 302 ? 302 : 301 }),
        ...(typeof body.isActive === "boolean" && { isActive: body.isActive }),
        ...(body.notes !== undefined && { notes: body.notes ? sanitizeInput(String(body.notes)) : null }),
      },
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
    await prisma.seoRedirect.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete redirect" }, { status: 500 });
  }
}
