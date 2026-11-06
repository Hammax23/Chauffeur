// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  getOrCreatePaySettings,
  writeAudit,
  backfillEarnings,
} from "@/lib/driver-pay";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getOrCreatePaySettings();

    const drivers = await prisma.driver.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        driverId: true,
        name: true,
        email: true,
        vehicle: true,
        commissionPctOverride: true,
        payoutNotes: true,
      },
    });

    return NextResponse.json({
      success: true,
      settings: {
        id: settings.id,
        defaultPlatformCommissionPercent: settings.defaultPlatformCommissionPercent,
        payoutCurrency: settings.payoutCurrency,
        updatedAt: settings.updatedAt.toISOString(),
      },
      drivers,
    });
  } catch (error) {
    console.error("[driver-pay-settings GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.defaultPlatformCommissionPercent != null) {
      const pct = Number(body.defaultPlatformCommissionPercent);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return NextResponse.json(
          { success: false, error: "defaultPlatformCommissionPercent must be between 0 and 100" },
          { status: 400 }
        );
      }
      data.defaultPlatformCommissionPercent = Math.round(pct * 100) / 100;
    }

    if (typeof body.payoutCurrency === "string" && body.payoutCurrency.trim()) {
      data.payoutCurrency = body.payoutCurrency.trim().slice(0, 8).toUpperCase();
    }

    // Per-driver override updates
    const driverPatches = Array.isArray(body.driverOverrides) ? body.driverOverrides : [];
    for (const p of driverPatches) {
      if (!p || typeof p.driverId !== "string") continue;
      const patch: Record<string, unknown> = {};
      if (p.commissionPctOverride === null || p.commissionPctOverride === "") {
        patch.commissionPctOverride = null;
      } else if (typeof p.commissionPctOverride === "number" || !Number.isNaN(Number(p.commissionPctOverride))) {
        const n = Number(p.commissionPctOverride);
        if (n < 0 || n > 100) {
          return NextResponse.json(
            { success: false, error: `Override for driver ${p.driverId} must be 0–100` },
            { status: 400 }
          );
        }
        patch.commissionPctOverride = Math.round(n * 100) / 100;
      }
      if (typeof p.payoutNotes === "string") {
        patch.payoutNotes = p.payoutNotes.slice(0, 500) || null;
      }
      if (Object.keys(patch).length > 0) {
        await prisma.driver.update({ where: { id: p.driverId }, data: patch });
        await writeAudit({
          action: "driver_pay_override_updated",
          entityType: "DRIVER",
          entityId: p.driverId,
          details: patch,
          actor: auth.actor || "admin",
        });
      }
    }

    if (Object.keys(data).length > 0) {
      await prisma.driverPaySettings.upsert({
        where: { id: "global" },
        update: data,
        create: { id: "global", ...(data as any) },
      });
      await writeAudit({
        action: "pay_settings_updated",
        entityType: "SETTINGS",
        entityId: "global",
        details: data,
        actor: auth.actor || "admin",
      });
    }

    const settings = await getOrCreatePaySettings();
    return NextResponse.json({
      success: true,
      settings: {
        id: settings.id,
        defaultPlatformCommissionPercent: settings.defaultPlatformCommissionPercent,
        payoutCurrency: settings.payoutCurrency,
        updatedAt: settings.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[driver-pay-settings PUT]", error);
    return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 });
  }
}

/** Trigger a chunked backfill of DONE/NO_SHOW reservations into the ledger. */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = !!body.dryRun;
    const chunkSize = body.chunkSize ? Number(body.chunkSize) : 100;
    const sinceRaw = body.since ? String(body.since) : null;
    const since = sinceRaw ? new Date(sinceRaw) : null;

    const stats = await backfillEarnings({
      dryRun,
      chunkSize,
      since: since && !isNaN(since.getTime()) ? since : null,
      actor: auth.actor || "admin",
    });

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("[driver-pay-settings POST backfill]", error);
    return NextResponse.json({ success: false, error: "Backfill failed" }, { status: 500 });
  }
}
