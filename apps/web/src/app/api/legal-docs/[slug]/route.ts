import { NextRequest, NextResponse } from "next/server";
import { isLegalSlug } from "@/lib/legal-docs";
import { getLegalDocument } from "@/lib/legal-docs-store";

/** Public — mobile app fetches legal HTML by slug. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    if (!isLegalSlug(slug)) {
      return NextResponse.json(
        { success: false, error: "Unknown document. Use privacy, terms, or refund." },
        { status: 400 }
      );
    }

    const doc = await getLegalDocument(slug);
    if (!doc) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      document: {
        slug: doc.slug,
        title: doc.title,
        contentHtml: doc.contentHtml,
        customCss: doc.customCss || "",
        updatedAt: doc.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[legal-docs] GET", err?.message || error);
    return NextResponse.json(
      { success: false, error: "Failed to load document" },
      { status: 500 }
    );
  }
}
