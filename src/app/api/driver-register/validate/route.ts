import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

// POST: Validate invite token (public)
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 400 }
      );
    }

    // Find invite by token
    const invite = await prisma.driverInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired invitation link" },
        { status: 404 }
      );
    }

    // Check if already used
    if (invite.status === "USED") {
      return NextResponse.json(
        { success: false, error: "This invitation has already been used" },
        { status: 410 }
      );
    }

    // Check if expired
    if (new Date() > invite.expiresAt) {
      // Mark as expired
      await prisma.driverInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });

      return NextResponse.json(
        { success: false, error: "This invitation has expired" },
        { status: 410 }
      );
    }

    // Check if revoked
    if (invite.status === "REVOKED") {
      return NextResponse.json(
        { success: false, error: "This invitation has been revoked" },
        { status: 410 }
      );
    }

    // Token is valid
    return NextResponse.json({
      success: true,
      invite: {
        email: invite.email,
        name: invite.name,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error: any) {
    console.error("Validate invite token error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate token" },
      { status: 500 }
    );
  }
}
