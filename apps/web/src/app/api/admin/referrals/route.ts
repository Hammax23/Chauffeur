import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { maybeIssueReferralReward } from "@/lib/referrals";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") || "ALL").toUpperCase();

    const where =
      status === "ALL"
        ? {}
        : { status: status as "PENDING" | "QUALIFIED" | "REJECTED" };

    const [attributions, rewards, summary] = await Promise.all([
      prisma.referralAttribution.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          referrer: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, referralCode: true },
          },
          referee: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
        },
      }),
      prisma.referralReward.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true, referralCode: true },
          },
        },
      }),
      prisma.referralAttribution.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const counts = { PENDING: 0, QUALIFIED: 0, REJECTED: 0 };
    for (const row of summary) {
      const key = row.status as keyof typeof counts;
      if (key in counts) counts[key] = row._count._all;
    }

    return NextResponse.json({
      success: true,
      summary: counts,
      attributions: attributions.map((a) => ({
        id: a.id,
        status: a.status,
        codeUsed: a.codeUsed,
        qualifiedAt: a.qualifiedAt?.toISOString() ?? null,
        refereeFirstBookingId: a.refereeFirstBookingId,
        adminNote: a.adminNote,
        createdAt: a.createdAt.toISOString(),
        referrer: a.referrer,
        referee: a.referee,
      })),
      rewards: rewards.map((r) => ({
        id: r.id,
        amount: r.amount,
        status: r.status,
        redeemedReservationId: r.redeemedReservationId,
        redeemedAt: r.redeemedAt?.toISOString() ?? null,
        voidedAt: r.voidedAt?.toISOString() ?? null,
        voidReason: r.voidReason,
        createdAt: r.createdAt.toISOString(),
        customer: r.customer,
      })),
    });
  } catch (error) {
    console.error("[admin/referrals] GET", error);
    return NextResponse.json(
      { success: false, error: "Failed to load referrals" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = String(body?.action || "").toLowerCase();

    if (action === "reject_attribution") {
      const id = String(body?.id || "").trim();
      if (!id) {
        return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
      }
      const note =
        typeof body?.adminNote === "string" ? body.adminNote.trim().slice(0, 300) : null;
      const updated = await prisma.referralAttribution.update({
        where: { id },
        data: {
          status: "REJECTED",
          adminNote: note || "Rejected by admin",
        },
      });
      return NextResponse.json({ success: true, attribution: { id: updated.id, status: updated.status } });
    }

    if (action === "qualify_attribution") {
      const id = String(body?.id || "").trim();
      if (!id) {
        return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
      }
      const updated = await prisma.referralAttribution.update({
        where: { id },
        data: {
          status: "QUALIFIED",
          qualifiedAt: new Date(),
          adminNote: "Manually qualified by admin",
        },
      });
      await maybeIssueReferralReward(updated.referrerId);
      return NextResponse.json({ success: true, attribution: { id: updated.id, status: updated.status } });
    }

    if (action === "void_reward") {
      const id = String(body?.id || "").trim();
      if (!id) {
        return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
      }
      const reason =
        typeof body?.voidReason === "string" ? body.voidReason.trim().slice(0, 300) : "Voided by admin";
      const existing = await prisma.referralReward.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ success: false, error: "Reward not found" }, { status: 404 });
      }
      if (existing.status === "REDEEMED") {
        return NextResponse.json(
          { success: false, error: "Already redeemed — cannot void." },
          { status: 400 }
        );
      }
      const updated = await prisma.referralReward.update({
        where: { id },
        data: {
          status: "VOID",
          voidedAt: new Date(),
          voidReason: reason,
        },
      });
      return NextResponse.json({ success: true, reward: { id: updated.id, status: updated.status } });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[admin/referrals] PATCH", error);
    return NextResponse.json(
      { success: false, error: "Failed to update referral" },
      { status: 500 }
    );
  }
}
