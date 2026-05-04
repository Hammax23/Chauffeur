import { NextRequest, NextResponse } from "next/server";
import { verifyDriverToken } from "@/lib/driver-auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const tokenData = await verifyDriverToken(request);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { pushToken } = await request.json();

    if (!pushToken) {
      return NextResponse.json({ success: false, error: "Push token is required" }, { status: 400 });
    }

    // Update driver's push token
    await prisma.driver.update({
      where: { id: tokenData.id },
      data: { pushToken },
    });

    return NextResponse.json({ success: true, message: "Push token registered" });
  } catch (error: any) {
    console.error("Push token registration error:", error);
    return NextResponse.json({ success: false, error: "Failed to register push token" }, { status: 500 });
  }
}
