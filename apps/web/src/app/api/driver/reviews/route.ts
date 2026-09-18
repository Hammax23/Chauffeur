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

/** GET — driver's trip reviews (who rated them + what they said). */
export async function GET(req: NextRequest) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 30));
    const cursor = url.searchParams.get("cursor") || undefined;

    const [driver, count, reviews] = await Promise.all([
      prisma.driver.findUnique({
        where: { id: tokenData.id },
        select: { rating: true },
      }),
      prisma.tripReview.count({ where: { driverId: tokenData.id } }),
      prisma.tripReview.findMany({
        where: { driverId: tokenData.id },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
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
      nextCursor,
      reviews: page.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        stars: r.stars,
        comment: r.comment,
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
