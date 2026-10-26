import { NextRequest, NextResponse } from "next/server";
import { verifyDriverToken } from "@/lib/driver-auth";
import {
  deletePushDeviceByToken,
  upsertPushDevice,
} from "@/lib/push-devices";

export async function POST(request: NextRequest) {
  try {
    const tokenData = await verifyDriverToken(request);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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
      role: "DRIVER",
      userId: tokenData.id,
      token: pushToken,
      platform,
    });

    return NextResponse.json({ success: true, message: "Push token registered" });
  } catch (error: unknown) {
    console.error("Push token registration error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to register push token" },
      { status: 500 }
    );
  }
}

/** Logout: remove this device token so signed-out phones stop receiving pushes. */
export async function DELETE(request: NextRequest) {
  try {
    const tokenData = await verifyDriverToken(request);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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
      role: "DRIVER",
      userId: tokenData.id,
      token: pushToken,
    });

    return NextResponse.json({ success: true, removed });
  } catch (error: unknown) {
    console.error("Driver push token DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear push token" },
      { status: 500 }
    );
  }
}
