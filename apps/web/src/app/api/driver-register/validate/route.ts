import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseVisibleFieldsFromDb } from "@/lib/driver-invite-config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// POST: Validate invite token (public)
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`driver-register-validate:${ip}`, {
      maxRequests: 10,
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

    const visibleFields = parseVisibleFieldsFromDb(invite.visibleFields);

    // Token is valid — only expose hint name/email when those fields are open; never leak prefilled-only data.
    return NextResponse.json({
      success: true,
      invite: {
        email: visibleFields.email ? invite.email : null,
        name: visibleFields.name ? invite.name : null,
        expiresAt: invite.expiresAt,
        visibleFields,
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
