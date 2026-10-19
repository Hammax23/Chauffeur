import { NextRequest, NextResponse } from "next/server";
import {
  getActiveCustomerFromRequest,
  customerAuthFailurePayload,
} from "@/lib/customer-auth";

/**
 * Disabled — customers must keep full trip history (receipts / support).
 * Endpoint kept so older app builds get a clear error instead of silently hiding.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Trips cannot be removed from History.",
        code: "HISTORY_REMOVE_DISABLED",
      },
      { status: 403 }
    );
  } catch (error) {
    console.error("[hide-from-history]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update History" },
      { status: 500 }
    );
  }
}
