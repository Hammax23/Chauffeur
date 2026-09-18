import prisma from "@/lib/prisma";

export const TRIP_REVIEW_COMMENT_MAX = 500;

export function clampTripReviewStars(raw: unknown): number | null {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return n;
}

export function normalizeTripReviewComment(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, TRIP_REVIEW_COMMENT_MAX);
  return trimmed.length > 0 ? trimmed : null;
}

/** Recompute Driver.rating from TripReview averages (1 decimal). */
export async function recomputeDriverRating(driverId: string): Promise<number> {
  const agg = await prisma.tripReview.aggregate({
    where: { driverId },
    _avg: { stars: true },
    _count: { _all: true },
  });

  const count = agg._count._all;
  const avg = agg._avg.stars;
  const rating =
    count > 0 && avg != null && Number.isFinite(avg)
      ? Math.round(avg * 10) / 10
      : 5.0;

  await prisma.driver.update({
    where: { id: driverId },
    data: { rating },
  });

  return rating;
}

export function formatReviewPayload(review: {
  stars: number;
  comment: string | null;
  createdAt: Date;
  updatedAt?: Date;
}) {
  return {
    stars: review.stars,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt?.toISOString() ?? undefined,
  };
}
