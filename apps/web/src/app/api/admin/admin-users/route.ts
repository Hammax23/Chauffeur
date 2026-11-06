// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, verifyAdminAuth } from "@/lib/admin-auth";
import { writeAudit } from "@/lib/driver-pay";

const MIN_PW_LEN = 10;

/** GET /api/admin/admin-users — list all admins (passwords never returned). */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admins = await prisma.adminUser.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      /**
       * `legacyActive` is true when the server is still falling back to the
       * ADMIN_PASSWORD env flow (i.e. the AdminUser table is empty). Tells
       * the UI that the first admin should be bootstrapped.
       */
      legacyActive: admins.length === 0,
      admins: admins.map((a) => ({
        id: a.id,
        email: a.email,
        name: a.name,
        isActive: a.isActive,
        lastLoginAt: a.lastLoginAt ? a.lastLoginAt.toISOString() : null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[admin admin-users GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load admins" }, { status: 500 });
  }
}

/** POST — create a new admin. Body: { email, password, name? } */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : null;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Valid email required" }, { status: 400 });
    }
    if (!password || password.length < MIN_PW_LEN) {
      return NextResponse.json(
        { success: false, error: `Password must be at least ${MIN_PW_LEN} characters` },
        { status: 400 }
      );
    }

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An admin with that email already exists" },
        { status: 409 }
      );
    }

    const hash = await hashPassword(password);
    const row = await prisma.adminUser.create({
      data: { email, password: hash, name },
      select: { id: true, email: true, name: true, isActive: true, createdAt: true },
    });

    await writeAudit({
      action: "admin_user_created",
      entityType: "ADMIN_USER",
      entityId: row.id,
      details: { email: row.email, name: row.name },
      actor: auth.actor || "admin",
    });

    return NextResponse.json({ success: true, admin: row });
  } catch (error) {
    console.error("[admin admin-users POST]", error);
    return NextResponse.json({ success: false, error: "Failed to create admin" }, { status: 500 });
  }
}

/** PUT — update isActive / name / password. Body: { id, isActive?, name?, newPassword? } */
export async function PUT(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
    }
    const existing = await prisma.adminUser.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (typeof body.name === "string") data.name = body.name.trim().slice(0, 120) || null;
    if (typeof body.newPassword === "string" && body.newPassword) {
      if (body.newPassword.length < MIN_PW_LEN) {
        return NextResponse.json(
          { success: false, error: `Password must be at least ${MIN_PW_LEN} characters` },
          { status: 400 }
        );
      }
      data.password = await hashPassword(body.newPassword);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "No changes" }, { status: 400 });
    }

    // Guard — prevent deactivating the last active admin (would soft-lock the panel).
    if (data.isActive === false && existing.isActive) {
      const activeCount = await prisma.adminUser.count({ where: { isActive: true } });
      if (activeCount <= 1) {
        return NextResponse.json(
          { success: false, error: "Cannot deactivate the last active admin." },
          { status: 409 }
        );
      }
    }

    const row = await prisma.adminUser.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, isActive: true, updatedAt: true },
    });

    await writeAudit({
      action: "admin_user_updated",
      entityType: "ADMIN_USER",
      entityId: id,
      details: {
        changedKeys: Object.keys(data),
        isActive: data.isActive,
      },
      actor: auth.actor || "admin",
    });

    return NextResponse.json({ success: true, admin: row });
  } catch (error) {
    console.error("[admin admin-users PUT]", error);
    return NextResponse.json({ success: false, error: "Failed to update admin" }, { status: 500 });
  }
}
