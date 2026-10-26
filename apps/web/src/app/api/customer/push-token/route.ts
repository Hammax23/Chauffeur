import { NextRequest, NextResponse } from "next/server";
import {
  getActiveCustomerFromRequest,
  customerAuthFailurePayload,
} from "@/lib/customer-auth";
import {
  deletePushDeviceByToken,
  upsertPushDevice,
} from "@/lib/push-devices";

export async function POST(request: NextRequest) {
  try {
    const auth = await getActiveCustomerFromRequest(request);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }

    const body = await request.json();
    const pushToken = body?.pushToken;
    if (!pushToken || typeof pushToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Push token is required" },
        { status: 400 }
      );
    }

    const platform =
      typeof body?.platform === "string" ? body.platform : null;

    await upsertPushDevice({
      role: "CUSTOMER",
      userId: auth.customer.id,
      token: pushToken,
      platform,
    });

    return NextResponse.json({ success: true, message: "Push token registered" });
  } catch (error) {
    console.error("Customer push token error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to register push token" },
      { status: 500 }
    );
  }
}

/** Logout: remove this device token so signed-out phones stop receiving pushes. */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getActiveCustomerFromRequest(request);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }

    let pushToken: string | undefined;
    try {
      const body = await request.json();
      if (typeof body?.pushToken === "string") pushToken = body.pushToken;
    } catch {
      /* empty body ok */
    }

    if (!pushToken) {
      return NextResponse.json(
        { success: false, error: "Push token is required" },
        { status: 400 }
      );
    }

    const removed = await deletePushDeviceByToken({
      role: "CUSTOMER",
      userId: auth.customer.id,
      token: pushToken,
    });

    return NextResponse.json({ success: true, removed });
  } catch (error) {
    console.error("Customer push token DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear push token" },
      { status: 500 }
    );
  }
}
