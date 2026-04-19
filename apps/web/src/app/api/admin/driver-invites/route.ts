import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import crypto from "crypto";

// Generate cryptographically secure token
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// GET: List all driver invites (admin only)
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invites = await prisma.driverInvite.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, invites });
  } catch (error: any) {
    console.error("Get driver invites error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch invites" }, { status: 500 });
  }
}

// POST: Create new driver invite (admin only)
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, name, expiryHours = 48 } = body;

    // Validate expiry hours (min 1 hour, max 168 hours / 7 days)
    const validExpiryHours = Math.min(Math.max(parseInt(expiryHours) || 48, 1), 168);

    // Generate secure token
    const token = generateSecureToken();

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + validExpiryHours);

    // Create invite in database
    const invite = await prisma.driverInvite.create({
      data: {
        token,
        email: email?.trim() || null,
        name: name?.trim() || null,
        status: "PENDING",
        expiresAt,
      },
    });

    // Generate the full registration URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || "";
    const registrationUrl = `${baseUrl}/driver-register/${token}`;

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        token: invite.token,
        email: invite.email,
        name: invite.name,
        status: invite.status,
        expiresAt: invite.expiresAt,
        registrationUrl,
      },
    });
  } catch (error: any) {
    console.error("Create driver invite error:", error);
    return NextResponse.json({ success: false, error: "Failed to create invite" }, { status: 500 });
  }
}

// DELETE: Revoke/delete an invite (admin only)
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Invite ID required" }, { status: 400 });
    }

    await prisma.driverInvite.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Invite revoked successfully" });
  } catch (error: any) {
    console.error("Delete driver invite error:", error);
    return NextResponse.json({ success: false, error: "Failed to revoke invite" }, { status: 500 });
  }
}
