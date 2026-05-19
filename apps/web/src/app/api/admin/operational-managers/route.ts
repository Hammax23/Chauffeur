import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth, hashPassword } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { prismaKnownErrorResponse } from "@/lib/prisma-errors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.operationalManager.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({
      success: true,
      operationalManagers: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("List operational managers:", e);
    const mapped = prismaKnownErrorResponse(e);
    if (mapped) {
      return NextResponse.json({ success: false, error: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json({ success: false, error: "Failed to list" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
    const password = typeof body.password === "string" ? body.password : "";
    const name =
      typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 200) : null;

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ success: false, error: "Valid email is required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const hashed = await hashPassword(password);

    const created = await prisma.operationalManager.create({
      data: {
        email,
        password: hashed,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      operationalManager: {
        ...created,
        createdAt: created.createdAt.toISOString(),
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
        { success: false, error: "An operational manager with this email already exists" },
        { status: 409 }
      );
    }
    console.error("Create operational manager:", e);
    return NextResponse.json({ success: false, error: "Failed to create" }, { status: 500 });
  }
}
