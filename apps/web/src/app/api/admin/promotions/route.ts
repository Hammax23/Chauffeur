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
  showInApp: boolean;
  bannerTitle: string | null;
  bannerMessage: string | null;
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
    showInApp: p.showInApp,
    bannerTitle: p.bannerTitle,
    bannerMessage: p.bannerMessage,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const promotions = await prisma.promotion.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      success: true,
      promotions: promotions.map(serializePromo),
    });
  } catch (error) {
    console.error("[admin/promotions] GET", error);
    return NextResponse.json(
      { success: false, error: "Failed to load promotions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const code = normalizePromoCode(body?.code);
    const type = String(body?.type || "").toUpperCase();
    const value = Number(body?.value);

    if (!code || code.length < 2) {
      return NextResponse.json(
        { success: false, error: "Enter a promo code (at least 2 characters)." },
        { status: 400 }
      );
    }
    if (type !== "PERCENT" && type !== "FIXED") {
      return NextResponse.json(
        { success: false, error: "Type must be PERCENT or FIXED." },
        { status: 400 }
      );
    }
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json(
        { success: false, error: "Enter a valid discount value." },
        { status: 400 }
      );
    }
    if (type === "PERCENT" && value > 100) {
      return NextResponse.json(
        { success: false, error: "Percent discount cannot exceed 100." },
        { status: 400 }
      );
    }

    const startsAt = parseOptionalDate(body?.startsAt);
    const endsAt = parseOptionalDate(body?.endsAt);
    if (body?.startsAt && startsAt === undefined) {
      return NextResponse.json({ success: false, error: "Invalid start date." }, { status: 400 });
    }
    if (body?.endsAt && endsAt === undefined) {
      return NextResponse.json({ success: false, error: "Invalid end date." }, { status: 400 });
    }

    const existing = await prisma.promotion.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A promotion with this code already exists." },
        { status: 409 }
      );
    }

    const maxPerCustomer =
      body?.maxPerCustomer === undefined
        ? 1
        : parseOptionalInt(body.maxPerCustomer);
    if (body?.maxPerCustomer !== undefined && maxPerCustomer === undefined) {
      return NextResponse.json(
        { success: false, error: "Invalid max per customer." },
        { status: 400 }
      );
    }

    const promotion = await prisma.promotion.create({
      data: {
        code,
        type,
        value,
        isActive: body?.isActive !== false,
        startsAt: startsAt === undefined ? null : startsAt,
        endsAt: endsAt === undefined ? null : endsAt,
        maxRedemptions: parseOptionalInt(body?.maxRedemptions) ?? null,
        maxPerCustomer: maxPerCustomer === undefined ? 1 : maxPerCustomer,
        minSubtotal: parseOptionalFloat(body?.minSubtotal) ?? null,
        label:
          typeof body?.label === "string" && body.label.trim()
            ? body.label.trim().slice(0, 200)
            : null,
        showInApp: body?.showInApp === true,
        bannerTitle:
          typeof body?.bannerTitle === "string" && body.bannerTitle.trim()
            ? body.bannerTitle.trim().slice(0, 80)
            : null,
        bannerMessage:
          typeof body?.bannerMessage === "string" && body.bannerMessage.trim()
            ? body.bannerMessage.trim().slice(0, 160)
            : null,
      },
    });

    return NextResponse.json({
      success: true,
      promotion: serializePromo(promotion),
    });
  } catch (error) {
    console.error("[admin/promotions] POST", error);
    return NextResponse.json(
      { success: false, error: "Failed to create promotion" },
      { status: 500 }
    );
  }
}
