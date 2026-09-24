import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { listLegalDocuments } from "@/lib/legal-docs-store";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const docs = await listLegalDocuments();
    return NextResponse.json({
      success: true,
      documents: docs.map((d) => ({
        id: d.id,
        slug: d.slug,
        title: d.title,
        contentHtml: d.contentHtml,
        customCss: d.customCss || "",
        updatedAt: d.updatedAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[admin/legal-docs] GET", err?.message || error);
    return NextResponse.json(
      { success: false, error: "Failed to load legal documents" },
      { status: 500 }
    );
  }
}
