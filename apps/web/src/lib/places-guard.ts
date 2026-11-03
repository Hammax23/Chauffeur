import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Shared abuse guard for unauthenticated /api/places/* proxies
 * (Google billing + key exposure risk).
 */
export async function enforcePlacesRateLimit(
  req: NextRequest
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`places:${ip}`, {
    maxRequests: 60,
    windowMs: 60 * 1000,
  });
  if (!rl.success) {
    return NextResponse.json(
      {
        success: false,
        error: `Too many requests. Please try again in ${rl.resetIn} seconds.`,
      },
      { status: 429 }
    );
  }
  return null;
}
