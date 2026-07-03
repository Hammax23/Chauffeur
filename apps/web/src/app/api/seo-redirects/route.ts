import { NextResponse } from "next/server";
import { getActiveRedirects } from "@/lib/seo-config";

/** Public read-only redirect list for middleware (cached) */
export async function GET() {
  const redirects = await getActiveRedirects();
  return NextResponse.json(redirects, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
