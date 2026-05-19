import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth, hashPassword } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { prismaKnownErrorResponse } from "@/lib/prisma-errors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.operationalManager.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const data: {
      email?: string;
      password?: string;
      name?: string | null;
      isActive?: boolean;
    } = {};

    if (typeof body.email === "string") {
      const email = normalizeEmail(body.email);
      if (!email || !EMAIL_RE.test(email)) {
        return NextResponse.json({ success: false, error: "Invalid email" }, { status: 400 });
      }
      data.email = email;
    }

    if (typeof body.password === "string" && body.password.length > 0) {
      if (body.password.length < 8) {
        return NextResponse.json(
          { success: false, error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }
      data.password = await hashPassword(body.password);
    }

    if (body.name !== undefined) {
      data.name =
        typeof body.name === "string" && body.name.trim()
          ? body.name.trim().slice(0, 200)
          : null;
    }

    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "No changes" }, { status: 400 });
    }

    const updated = await prisma.operationalManager.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      operationalManager: {
        ...updated,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e: unknown) {
    const mapped = prismaKnownErrorResponse(e);
    if (mapped) {
      return NextResponse.json({ success: false, error: mapped.message }, { status: mapped.status });
    }
    const code = e && typeof e === "object" && "code" in e ? (e as { code?: string }).code : "";
    if (code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Email already in use" },
        { status: 409 }
      );
    }
    console.error("Update operational manager:", e);
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.operationalManager.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const mapped = prismaKnownErrorResponse(e);
    if (mapped) {
      return NextResponse.json({ success: false, error: mapped.message }, { status: mapped.status });
    }
    const code = e && typeof e === "object" && "code" in e ? (e as { code?: string }).code : "";
    if (code === "P2025") {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    console.error("Delete operational manager:", e);
    return NextResponse.json({ success: false, error: "Failed to delete" }, { status: 500 });
  }
}
