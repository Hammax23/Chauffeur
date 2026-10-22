import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

function getDriverFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      type: string;
    };
    if (decoded.type !== "driver") return null;
    return decoded;
  } catch {
    return null;
  }
}

function shortLocation(value: string | null | undefined, max = 48): string {
  const raw = (value || "").trim();
  if (!raw) return "—";
  const first = raw.split(",")[0]?.trim() || raw;
  if (first.length <= max) return first;
  return `${first.slice(0, max - 1)}…`;
}

/** Uber-style 5→1 star bucket counts for the summary card. */
function buildStarBreakdown(
  rows: { stars: number; _count: { _all: number } }[]
): Record<"1" | "2" | "3" | "4" | "5", number> {
  const breakdown: Record<"1" | "2" | "3" | "4" | "5", number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };
  for (const row of rows) {
    const key = String(Math.min(5, Math.max(1, Math.round(row.stars)))) as
      | "1"
      | "2"
      | "3"
      | "4"
      | "5";
    breakdown[key] = row._count._all;
  }
  return breakdown;
}

/** GET — driver's trip reviews (stars only for driver; comments stay admin-only). */
export async function GET(req: NextRequest) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 30));
    const cursor = url.searchParams.get("cursor") || undefined;

    const [driver, count, starGroups, reviews] = await Promise.all([
      prisma.driver.findUnique({
        where: { id: tokenData.id },
        select: { rating: true },
      }),
      prisma.tripReview.count({ where: { driverId: tokenData.id } }),
      prisma.tripReview.groupBy({
        by: ["stars"],
        where: { driverId: tokenData.id },
        _count: { _all: true },
      }),
      prisma.tripReview.findMany({
        where: { driverId: tokenData.id },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          bookingId: true,
          stars: true,
          createdAt: true,
          customer: { select: { firstName: true, lastName: true } },
          reservation: {
            select: {
              bookingId: true,
              serviceDate: true,
              serviceTime: true,
              pickupLocation: true,
              dropoffLocation: true,
            },
          },
        },
      }),
    ]);

    const hasMore = reviews.length > limit;
    const page = hasMore ? reviews.slice(0, limit) : reviews;
    const nextCursor = hasMore ? page[page.length - 1]?.id : null;

    return NextResponse.json({
      success: true,
      average: driver?.rating ?? 5,
      count,
      breakdown: buildStarBreakdown(starGroups),
      nextCursor,
      reviews: page.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        stars: r.stars,
        createdAt: r.createdAt.toISOString(),
        customerName:
          [r.customer.firstName, r.customer.lastName].filter(Boolean).join(" ").trim() ||
          "Customer",
        serviceDate: r.reservation.serviceDate,
        serviceTime: r.reservation.serviceTime,
        pickupShort: shortLocation(r.reservation.pickupLocation),
        dropoffShort: shortLocation(r.reservation.dropoffLocation),
      })),
    });
  } catch (error) {
    console.error("[driver-reviews]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Failed to load reviews" },
      { status: 500 }
    );
  }
}
