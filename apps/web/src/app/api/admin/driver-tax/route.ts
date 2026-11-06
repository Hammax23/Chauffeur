// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  computeTaxYearSummaries,
  generateAndPersistTaxYear,
  toCsv,
} from "@/lib/driver-tax";

function torontoCurrentYear(): number {
  // Use Intl to read the "year" in America/Toronto — avoids UTC-year-end drift.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
  });
  return Number(fmt.format(new Date())) || new Date().getUTCFullYear();
}

/**
 * GET /api/admin/driver-tax?year=YYYY[&format=csv][&live=1]
 *   - Default: return persisted DriverTaxYearSummary rows for the given year.
 *   - `live=1`: compute fresh from ledger without persisting (preview).
 *   - `format=csv`: stream a CSV download for the accountant.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const yearRaw = Number(url.searchParams.get("year"));
    const year =
      Number.isInteger(yearRaw) && yearRaw >= 2000 && yearRaw <= 2100
        ? yearRaw
        : torontoCurrentYear();
    const format = (url.searchParams.get("format") || "json").toLowerCase();
    const live = url.searchParams.get("live") === "1";

    let rows: Awaited<ReturnType<typeof computeTaxYearSummaries>>;

    if (live) {
      rows = await computeTaxYearSummaries(year);
    } else {
      const persisted = await prisma.driverTaxYearSummary.findMany({
        where: { year },
        orderBy: [{ totalPaid: "desc" }, { createdAt: "asc" }],
        include: {
          driver: { select: { driverId: true, name: true, email: true } },
        },
      });
      rows = persisted.map((p) => ({
        driverId: p.driverId,
        driverCode: p.driver?.driverId || "",
        driverName: p.driver?.name || "",
        driverEmail: p.driver?.email || "",
        year: p.year,
        totalPaid: p.totalPaid,
        earningsPaid: p.earningsPaid,
        adjustmentsTotal: p.adjustmentsTotal,
        earningsCount: p.earningsCount,
        adjustmentsCount: p.adjustmentsCount,
        generatedAt: p.generatedAt.toISOString(),
      }));
    }

    // Available years for admin UI dropdown.
    const yearsRaw = await prisma.driverTaxYearSummary.findMany({
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "desc" },
    });
    const availableYears = Array.from(new Set(yearsRaw.map((r) => r.year)));
    if (!availableYears.includes(year)) availableYears.unshift(year);

    if (format === "csv") {
      const csv = toCsv(rows, year);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="sarj-driver-tax-${year}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const totalPaid = rows.reduce((s, r) => s + (r.totalPaid || 0), 0);

    return NextResponse.json({
      success: true,
      year,
      live,
      availableYears,
      summary: {
        driverCount: rows.length,
        totalPaid: Math.round(totalPaid * 100) / 100,
      },
      rows,
    });
  } catch (error) {
    console.error("[admin driver-tax GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load tax summary" }, { status: 500 });
  }
}

/** POST — generate & persist summary rows for the given year. */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const yearRaw = Number(body.year);
    const year =
      Number.isInteger(yearRaw) && yearRaw >= 2000 && yearRaw <= 2100
        ? yearRaw
        : torontoCurrentYear();

    const result = await generateAndPersistTaxYear(year, auth.actor || "admin");
    return NextResponse.json({ success: true, year, generated: result.generated, rows: result.rows });
  } catch (error) {
    console.error("[admin driver-tax POST]", error);
    return NextResponse.json({ success: false, error: "Failed to generate tax summary" }, { status: 500 });
  }
}
