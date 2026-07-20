import { NextRequest, NextResponse } from "next/server";
import { getActiveRedirects } from "@/lib/seo-config";
import { getSeoRedirectsInternalSecret } from "@/lib/seo-redirects-secret";

/** Middleware-only redirect list — not publicly readable */
export async function GET(request: NextRequest) {
  const expected = getSeoRedirectsInternalSecret();
  const provided = request.headers.get("x-seo-redirects-secret");

  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const redirects = await getActiveRedirects();
  return NextResponse.json(redirects, {
    headers: {
      "Cache-Control": "private, max-age=10",
    },
  });
}
