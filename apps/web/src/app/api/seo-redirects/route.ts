import { NextRequest, NextResponse } from "next/server";
import { getActiveRedirects } from "@/lib/seo-config";

function getRedirectsInternalSecret(): string | null {
  return (
    process.env.SEO_REDIRECTS_INTERNAL_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    null
  );
}

/** Middleware-only redirect list — not publicly readable */
export async function GET(request: NextRequest) {
  const expected = getRedirectsInternalSecret();
  const provided = request.headers.get("x-seo-redirects-secret");

  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const redirects = await getActiveRedirects();
  return NextResponse.json(redirects, {
    headers: {
      "Cache-Control": "private, max-age=60",
    },
  });
}
