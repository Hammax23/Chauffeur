import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  isLegalSlug,
  sanitizeLegalCss,
  sanitizeLegalHtml,
  LEGAL_DEFAULT_TITLES,
} from "@/lib/legal-docs";
import { ensureLegalDocuments } from "@/lib/legal-docs-store";
import { sanitizePlainText } from "@/lib/sanitize";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await context.params;
    if (!isLegalSlug(slug)) {
      return NextResponse.json({ success: false, error: "Invalid slug" }, { status: 400 });
    }
    await ensureLegalDocuments();
    const doc = await prisma.legalDocument.findUnique({ where: { slug } });
    if (!doc) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        slug: doc.slug,
        title: doc.title,
        contentHtml: doc.contentHtml,
        customCss: doc.customCss || "",
        updatedAt: doc.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[admin/legal-docs/slug] GET", err?.message || error);
    return NextResponse.json({ success: false, error: "Failed to load" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await context.params;
    if (!isLegalSlug(slug)) {
      return NextResponse.json({ success: false, error: "Invalid slug" }, { status: 400 });
    }

    const body = await request.json();
    const title =
      body.title != null
        ? sanitizePlainText(String(body.title), 200).trim() || LEGAL_DEFAULT_TITLES[slug]
        : undefined;
    const contentHtml =
      body.contentHtml != null ? sanitizeLegalHtml(String(body.contentHtml)) : undefined;
    const customCss =
      body.customCss != null ? sanitizeLegalCss(String(body.customCss)) : undefined;

    await ensureLegalDocuments();

    const doc = await prisma.legalDocument.update({
      where: { slug },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(contentHtml !== undefined ? { contentHtml } : {}),
        ...(customCss !== undefined ? { customCss } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        slug: doc.slug,
        title: doc.title,
        contentHtml: doc.contentHtml,
        customCss: doc.customCss || "",
        updatedAt: doc.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[admin/legal-docs/slug] PUT", err?.message || error);
    return NextResponse.json({ success: false, error: "Failed to save" }, { status: 500 });
  }
}
