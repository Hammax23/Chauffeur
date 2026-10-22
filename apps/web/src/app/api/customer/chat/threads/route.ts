import { NextRequest, NextResponse } from "next/server";
import {
  getActiveCustomerFromRequest,
  customerAuthFailurePayload,
} from "@/lib/customer-auth";
import { listCustomerChatThreads } from "@/lib/trip-chat";

/** Customer inbox: active (non soft-hidden) chat threads + total unread. */
export async function GET(req: NextRequest) {
  try {
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }

    const data = await listCustomerChatThreads(auth.customer.id);
    return NextResponse.json({
      success: true,
      threads: data.threads,
      totalUnread: data.totalUnread,
    });
  } catch (error) {
    console.error("[customer chat threads]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load inbox" },
      { status: 500 }
    );
  }
}
