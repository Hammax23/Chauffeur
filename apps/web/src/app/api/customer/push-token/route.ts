import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const tokenData = getCustomerFromRequest(request);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { pushToken } = await request.json();
    if (!pushToken || typeof pushToken !== "string") {
      return NextResponse.json({ success: false, error: "Push token is required" }, { status: 400 });
    }

    await prisma.customer.update({
      where: { id: tokenData.id },
      data: { pushToken },
    });

    return NextResponse.json({ success: true, message: "Push token registered" });
  } catch (error) {
    console.error("Customer push token error:", error);
    return NextResponse.json({ success: false, error: "Failed to register push token" }, { status: 500 });
  }
}
