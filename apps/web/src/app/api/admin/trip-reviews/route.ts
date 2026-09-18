import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

function shortLocation(value: string | null | undefined, max = 56): string {
  const raw = (value || "").trim();
  if (!raw) return "—";
  const first = raw.split(",")[0]?.trim() || raw;
  if (first.length <= max) return first;
  return `${first.slice(0, max - 1)}…`;
}

/**
 * GET — all customer trip reviews for admin oversight.
 * Query: driverId?, q?, hasComment=1?, maxStars?, limit?, cursor?
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const driverId = url.searchParams.get("driverId")?.trim() || undefined;
    const q = url.searchParams.get("q")?.trim() || "";
    const hasComment = url.searchParams.get("hasComment") === "1";
    const maxStarsRaw = url.searchParams.get("maxStars");
    const maxStars =
      maxStarsRaw != null && maxStarsRaw !== ""
        ? Math.min(5, Math.max(1, Number(maxStarsRaw)))
        : undefined;
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const cursor = url.searchParams.get("cursor") || undefined;

    const reviewWhere: Record<string, unknown> = {};

    if (driverId) reviewWhere.driverId = driverId;
    if (hasComment) {
      reviewWhere.AND = [{ comment: { not: null } }, { comment: { not: "" } }];
    }
    if (maxStars != null && !Number.isNaN(maxStars)) {
      reviewWhere.stars = { lte: maxStars };
    }

    if (q) {
      reviewWhere.OR = [
        { bookingId: { contains: q, mode: "insensitive" } },
        { comment: { contains: q, mode: "insensitive" } },
        { customer: { firstName: { contains: q, mode: "insensitive" } } },
        { customer: { lastName: { contains: q, mode: "insensitive" } } },
        { customer: { email: { contains: q, mode: "insensitive" } } },
        { driver: { name: { contains: q, mode: "insensitive" } } },
        { driver: { email: { contains: q, mode: "insensitive" } } },
        { driver: { driverId: { contains: q, mode: "insensitive" } } },
      ];
    }

    // Sidebar: same search/rating filters, but never pinned to one driver
    const driverSidebarWhere: Record<string, unknown> = {};
    if (hasComment) {
      driverSidebarWhere.AND = [{ comment: { not: null } }, { comment: { not: "" } }];
    }
    if (maxStars != null && !Number.isNaN(maxStars)) {
      driverSidebarWhere.stars = { lte: maxStars };
    }
    if (q) {
      driverSidebarWhere.OR = [
        { bookingId: { contains: q, mode: "insensitive" } },
        { comment: { contains: q, mode: "insensitive" } },
        { customer: { firstName: { contains: q, mode: "insensitive" } } },
        { customer: { lastName: { contains: q, mode: "insensitive" } } },
        { customer: { email: { contains: q, mode: "insensitive" } } },
        { driver: { name: { contains: q, mode: "insensitive" } } },
        { driver: { email: { contains: q, mode: "insensitive" } } },
        { driver: { driverId: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [totalCount, avgAgg, byDriverRaw, reviews] = await Promise.all([
      prisma.tripReview.count({ where: reviewWhere }),
      prisma.tripReview.aggregate({
        where: reviewWhere,
        _avg: { stars: true },
      }),
      prisma.tripReview.groupBy({
        by: ["driverId"],
        where: driverSidebarWhere,
        _count: { _all: true },
        _avg: { stars: true },
        orderBy: { _count: { driverId: "desc" } },
      }),
      prisma.tripReview.findMany({
        where: reviewWhere,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          driver: {
            select: {
              id: true,
              driverId: true,
              name: true,
              email: true,
              phone: true,
              photo: true,
              rating: true,
              vehicle: true,
              vehiclePlate: true,
            },
          },
          reservation: {
            select: {
              bookingId: true,
              serviceDate: true,
              serviceTime: true,
              pickupLocation: true,
              dropoffLocation: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const driverIds = byDriverRaw.map((r) => r.driverId);
    const drivers =
      driverIds.length > 0
        ? await prisma.driver.findMany({
            where: { id: { in: driverIds } },
            select: {
              id: true,
              driverId: true,
              name: true,
              photo: true,
              rating: true,
              vehiclePlate: true,
            },
          })
        : [];
    const driverMap = new Map(drivers.map((d) => [d.id, d]));

    const hasMore = reviews.length > limit;
    const page = hasMore ? reviews.slice(0, limit) : reviews;
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

    return NextResponse.json({
      success: true,
      summary: {
        totalReviews: totalCount,
        averageStars:
          avgAgg._avg.stars != null
            ? Math.round(avgAgg._avg.stars * 10) / 10
            : null,
        driversWithReviews: byDriverRaw.length,
      },
      drivers: byDriverRaw.map((row) => {
        const d = driverMap.get(row.driverId);
        return {
          id: row.driverId,
          driverCode: d?.driverId ?? null,
          name: d?.name ?? "Unknown driver",
          photo: d?.photo ?? null,
          vehiclePlate: d?.vehiclePlate ?? null,
          liveRating: d?.rating ?? null,
          reviewCount: row._count._all,
          averageStars:
            row._avg.stars != null ? Math.round(row._avg.stars * 10) / 10 : null,
        };
      }),
      nextCursor,
      reviews: page.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        stars: r.stars,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        customer: {
          id: r.customer.id,
          name:
            [r.customer.firstName, r.customer.lastName].filter(Boolean).join(" ").trim() ||
            "Customer",
          email: r.customer.email,
          phone: r.customer.phone,
        },
        driver: {
          id: r.driver.id,
          driverCode: r.driver.driverId,
          name: r.driver.name,
          email: r.driver.email,
          phone: r.driver.phone,
          photo: r.driver.photo,
          rating: r.driver.rating,
          vehicle: r.driver.vehicle,
          vehiclePlate: r.driver.vehiclePlate,
        },
        trip: {
          serviceDate: r.reservation.serviceDate,
          serviceTime: r.reservation.serviceTime,
          pickupShort: shortLocation(r.reservation.pickupLocation),
          dropoffShort: shortLocation(r.reservation.dropoffLocation),
          status: r.reservation.status,
        },
      })),
    });
  } catch (error) {
    console.error("[admin-trip-reviews]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Failed to load trip reviews" },
      { status: 500 }
    );
  }
}
