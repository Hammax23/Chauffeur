import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { normalizePromoCode } from "@/lib/promotions";

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === null) return null;
  if (value === undefined || value === "") return undefined;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function parseOptionalInt(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.floor(n);
}

function parseOptionalFloat(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function serializePromo(p: {
  id: string;
  code: string;
  type: string;
  value: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  maxPerCustomer: number | null;
  minSubtotal: number | null;
  label: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    code: p.code,
    type: p.type,
    value: p.value,
    isActive: p.isActive,
    startsAt: p.startsAt?.toISOString() ?? null,
    endsAt: p.endsAt?.toISOString() ?? null,
    maxRedemptions: p.maxRedemptions,
    redeemedCount: p.redeemedCount,
    maxPerCustomer: p.maxPerCustomer,
    minSubtotal: p.minSubtotal,
    label: p.label,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Ctx) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    }

    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Promotion not found" }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body?.code !== undefined) {
      const code = normalizePromoCode(body.code);
      if (!code || code.length < 2) {
        return NextResponse.json(
          { success: false, error: "Enter a promo code (at least 2 characters)." },
          { status: 400 }
        );
      }
      if (code !== existing.code) {
        const clash = await prisma.promotion.findUnique({ where: { code } });
        if (clash) {
          return NextResponse.json(
            { success: false, error: "A promotion with this code already exists." },
            { status: 409 }
          );
        }
      }
      data.code = code;
    }

    if (body?.type !== undefined) {
      const type = String(body.type).toUpperCase();
      if (type !== "PERCENT" && type !== "FIXED") {
        return NextResponse.json(
          { success: false, error: "Type must be PERCENT or FIXED." },
          { status: 400 }
        );
      }
      data.type = type;
    }

    if (body?.value !== undefined) {
      const value = Number(body.value);
      if (!Number.isFinite(value) || value <= 0) {
        return NextResponse.json(
          { success: false, error: "Enter a valid discount value." },
          { status: 400 }
        );
      }
      const type = (data.type as string) || existing.type;
      if (type === "PERCENT" && value > 100) {
        return NextResponse.json(
          { success: false, error: "Percent discount cannot exceed 100." },
          { status: 400 }
        );
      }
      data.value = value;
    }

    if (body?.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    if (body?.startsAt !== undefined) {
      const startsAt = parseOptionalDate(body.startsAt);
      if (body.startsAt !== null && body.startsAt !== "" && startsAt === undefined) {
        return NextResponse.json({ success: false, error: "Invalid start date." }, { status: 400 });
      }
      data.startsAt = startsAt ?? null;
    }

    if (body?.endsAt !== undefined) {
      const endsAt = parseOptionalDate(body.endsAt);
      if (body.endsAt !== null && body.endsAt !== "" && endsAt === undefined) {
        return NextResponse.json({ success: false, error: "Invalid end date." }, { status: 400 });
      }
      data.endsAt = endsAt ?? null;
    }

    if (body?.maxRedemptions !== undefined) {
      const n = parseOptionalInt(body.maxRedemptions);
      if (body.maxRedemptions !== null && body.maxRedemptions !== "" && n === undefined) {
        return NextResponse.json(
          { success: false, error: "Invalid max redemptions." },
          { status: 400 }
        );
      }
      data.maxRedemptions = n ?? null;
    }

    if (body?.maxPerCustomer !== undefined) {
      const n = parseOptionalInt(body.maxPerCustomer);
      if (body.maxPerCustomer !== null && body.maxPerCustomer !== "" && n === undefined) {
        return NextResponse.json(
          { success: false, error: "Invalid max per customer." },
          { status: 400 }
        );
      }
      data.maxPerCustomer = n ?? null;
    }

    if (body?.minSubtotal !== undefined) {
      const n = parseOptionalFloat(body.minSubtotal);
      if (body.minSubtotal !== null && body.minSubtotal !== "" && n === undefined) {
        return NextResponse.json(
          { success: false, error: "Invalid minimum subtotal." },
          { status: 400 }
        );
      }
      data.minSubtotal = n ?? null;
    }

    if (body?.label !== undefined) {
      data.label =
        typeof body.label === "string" && body.label.trim()
          ? body.label.trim().slice(0, 200)
          : null;
    }

    const promotion = await prisma.promotion.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      promotion: serializePromo(promotion),
    });
  } catch (error) {
    console.error("[admin/promotions] PATCH", error);
    return NextResponse.json(
      { success: false, error: "Failed to update promotion" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    }

    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Promotion not found" }, { status: 404 });
    }

    await prisma.promotion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/promotions] DELETE", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete promotion" },
      { status: 500 }
    );
  }
}
