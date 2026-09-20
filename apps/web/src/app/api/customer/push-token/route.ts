import { NextRequest, NextResponse } from "next/server";
import {
  getActiveCustomerFromRequest,
  customerAuthFailurePayload,
} from "@/lib/customer-auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const auth = await getActiveCustomerFromRequest(request);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }

    const { pushToken } = await request.json();
    if (!pushToken || typeof pushToken !== "string") {
      return NextResponse.json({ success: false, error: "Push token is required" }, { status: 400 });
    }

    await prisma.customer.update({
      where: { id: auth.customer.id },
      data: { pushToken },
    });

    return NextResponse.json({ success: true, message: "Push token registered" });
  } catch (error) {
    console.error("Customer push token error:", error);
    return NextResponse.json({ success: false, error: "Failed to register push token" }, { status: 500 });
  }
}
