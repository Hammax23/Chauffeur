import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import crypto from "crypto";
import {
  normalizeVisibleFields,
  normalizePrefilledFields,
  validatePrefilledForHidden,
  type PrefilledFieldsMap,
  type VisibleFieldsMap,
  DRIVER_INVITE_FIELD_KEYS,
} from "@/lib/driver-invite-config";

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
    const { email, name, expiryHours = 48, visibleFields: rawVisible, prefilledFields: rawPrefilled } = body;

    const visibleFields = normalizeVisibleFields(rawVisible);
    const prefilledFields = normalizePrefilledFields(rawPrefilled);

    const prefilledErr = validatePrefilledForHidden(visibleFields, prefilledFields);
    if (prefilledErr) {
      return NextResponse.json({ success: false, error: prefilledErr }, { status: 400 });
    }

    // Validate expiry hours (min 1 hour, max 168 hours / 7 days)
    const validExpiryHours = Math.min(Math.max(parseInt(expiryHours) || 48, 1), 168);

    // Generate secure token
    const token = generateSecureToken();

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + validExpiryHours);

    // Optional hints when field is visible on registration form
    const hintName = name?.trim() || null;
    const hintEmail = email?.trim() || null;

    // Stored listing labels: prefer hints; hidden fields use prefilled
    const resolvedName =
      (visibleFields.name ? hintName : prefilledFields.name?.trim()) || hintName || prefilledFields.name?.trim() || null;
    const resolvedEmail =
      (visibleFields.email ? hintEmail : prefilledFields.email?.trim()) || hintEmail || prefilledFields.email?.trim() || null;

    // Only persist prefilled keys for hidden fields (keep payload small)
    const prefilledOnlyHidden: PrefilledFieldsMap = {};
    for (const key of DRIVER_INVITE_FIELD_KEYS) {
      if (!visibleFields[key] && prefilledFields[key]?.trim()) {
        prefilledOnlyHidden[key] = prefilledFields[key]!.trim();
      }
    }

    // Create invite in database
    const invite = await prisma.driverInvite.create({
      data: {
        token,
        email: resolvedEmail,
        name: resolvedName,
        visibleFields: visibleFields as object,
        ...(Object.keys(prefilledOnlyHidden).length > 0
          ? { prefilledFields: prefilledOnlyHidden as object }
          : {}),
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
        visibleFields: normalizeVisibleFields(invite.visibleFields),
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
