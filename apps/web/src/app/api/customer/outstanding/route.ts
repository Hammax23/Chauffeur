import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getActiveCustomerFromRequest,
  customerAuthFailurePayload,
} from "@/lib/customer-auth";
import { chargeCustomerOffSession } from "@/lib/off-session-charge";
import { recomputeCustomerOutstanding } from "@/lib/fare-adjustments";
import { ensureStripeCustomer, getStripe } from "@/lib/stripe-customer";

/** GET outstanding balance + failed/pending adjustments. */
export async function GET(req: NextRequest) {
  try {
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: auth.customer.id },
      select: { outstandingBalance: true },
    });

    const adjustments = await prisma.fareAdjustment.findMany({
      where: {
        customerId: auth.customer.id,
        status: { in: ["PENDING", "FAILED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      outstandingBalance: customer?.outstandingBalance || 0,
      adjustments: adjustments.map((a) => ({
        id: a.id,
        bookingId: a.bookingId,
        type: a.type,
        description: a.description,
        total: a.total,
        status: a.status,
        failureMessage: a.failureMessage,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[customer outstanding GET]", e);
    return NextResponse.json(
      { success: false, error: "Failed to load outstanding balance" },
      { status: 500 }
    );
  }
}

/** POST — retry charging all unpaid adjustments (Pay now). */
export async function POST(req: NextRequest) {
  try {
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: "Payments are temporarily unavailable." },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const paymentMethodId =
      typeof body?.paymentMethodId === "string" ? body.paymentMethodId.trim() : "";

    const customer = await prisma.customer.findUnique({
      where: { id: auth.customer.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        stripeCustomerId: true,
      },
    });
    if (!customer) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const stripe = getStripe();
    const stripeCustomerId = await ensureStripeCustomer(customer, stripe);

    const adjustments = await prisma.fareAdjustment.findMany({
      where: {
        customerId: customer.id,
        status: { in: ["PENDING", "FAILED"] },
      },
      orderBy: { createdAt: "asc" },
    });

    if (adjustments.length === 0) {
      await recomputeCustomerOutstanding(customer.id);
      return NextResponse.json({
        success: true,
        paid: 0,
        failed: 0,
        outstandingBalance: 0,
      });
    }

    let paid = 0;
    let failed = 0;

    for (const adj of adjustments) {
      const charge = await chargeCustomerOffSession({
        stripeCustomerId,
        amountCad: adj.total,
        description: adj.description || `Outstanding ${adj.type}`,
        preferredPaymentMethodId: paymentMethodId || adj.stripePaymentMethodId,
        idempotencyKey: `retry:${adj.id}`,
        metadata: {
          bookingId: adj.bookingId,
          adjustmentId: adj.id,
          type: adj.type,
        },
      });

      if (charge.ok) {
        await prisma.fareAdjustment.update({
          where: { id: adj.id },
          data: {
            status: "PAID",
            stripePaymentIntentId: charge.paymentIntentId,
            stripePaymentMethodId: charge.paymentMethodId,
            failureMessage: null,
          },
        });
        paid += 1;
      } else {
        await prisma.fareAdjustment.update({
          where: { id: adj.id },
          data: { status: "FAILED", failureMessage: charge.message },
        });
        failed += 1;
      }
    }

    const outstandingBalance = await recomputeCustomerOutstanding(customer.id);

    return NextResponse.json({
      success: failed === 0,
      paid,
      failed,
      outstandingBalance,
      error:
        failed > 0
          ? "Some charges could not be completed. Update your card and try again."
          : undefined,
    });
  } catch (e) {
    console.error("[customer outstanding POST]", e);
    return NextResponse.json(
      { success: false, error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
