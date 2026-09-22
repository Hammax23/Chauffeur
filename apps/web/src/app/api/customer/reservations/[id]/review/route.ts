import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  blockedCustomerResponse,
  getActiveCustomerFromRequest,
} from "@/lib/customer-auth";
import {
  clampTripReviewStars,
  formatReviewPayload,
  normalizeTripReviewComment,
  recomputeDriverRating,
} from "@/lib/trip-review";
import { notifyDriverTripReviewed } from "@/lib/driver-push";

/**
 * POST — submit a one-shot trip review for a completed reservation.
 * Path id = bookingId. Edits after submit are not allowed.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      if (auth.reason === "blocked") {
        return NextResponse.json(blockedCustomerResponse(), { status: 403 });
      }
      if (auth.reason === "deactivated") {
        return NextResponse.json(
          {
            success: false,
            error: "Your account has been deactivated.",
            code: "ACCOUNT_DEACTIVATED",
          },
          { status: 403 }
        );
      }
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const body = await req.json().catch(() => ({}));
    const stars = clampTripReviewStars(body.stars);
    if (stars == null) {
      return NextResponse.json(
        { success: false, error: "Please choose a rating from 1 to 5 stars." },
        { status: 400 }
      );
    }
    const comment = normalizeTripReviewComment(body.comment);

    const reservation = await prisma.reservation.findFirst({
      where: { bookingId, customerId: auth.customer.id },
      select: {
        id: true,
        bookingId: true,
        status: true,
        assignedDriverId: true,
      },
    });

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }
    if (reservation.status !== "DONE") {
      return NextResponse.json(
        { success: false, error: "You can only review a completed trip." },
        { status: 400 }
      );
    }
    if (!reservation.assignedDriverId) {
      return NextResponse.json(
        { success: false, error: "No chauffeur was assigned to this trip." },
        { status: 400 }
      );
    }

    const existing = await prisma.tripReview.findUnique({
      where: { reservationId: reservation.id },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "You have already reviewed this trip. Reviews cannot be changed.",
          code: "REVIEW_ALREADY_SUBMITTED",
        },
        { status: 409 }
      );
    }

    let review;
    try {
      review = await prisma.tripReview.create({
        data: {
          reservationId: reservation.id,
          bookingId: reservation.bookingId,
          customerId: auth.customer.id,
          driverId: reservation.assignedDriverId,
          stars,
          comment,
        },
      });
    } catch (err) {
      // Concurrent first submit — unique reservationId
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: string }).code)
          : "";
      if (code === "P2002") {
        return NextResponse.json(
          {
            success: false,
            error: "You have already reviewed this trip. Reviews cannot be changed.",
            code: "REVIEW_ALREADY_SUBMITTED",
          },
          { status: 409 }
        );
      }
      throw err;
    }

    const driverRating = await recomputeDriverRating(reservation.assignedDriverId);

    const customer = await prisma.customer.findUnique({
      where: { id: auth.customer.id },
      select: { firstName: true, lastName: true },
    });
    const customerName =
      [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim() ||
      "A customer";
    void notifyDriverTripReviewed({
      driverId: reservation.assignedDriverId,
      bookingId: reservation.bookingId,
      customerName,
      stars,
    }).catch((e) => console.error("[trip-review-push]", e));

    return NextResponse.json({
      success: true,
      review: formatReviewPayload(review),
      driverRating,
    });
  } catch (error) {
    console.error("[trip-review]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Could not save your review. Please try again." },
      { status: 500 }
    );
  }
}
