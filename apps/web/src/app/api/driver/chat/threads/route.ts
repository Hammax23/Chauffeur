import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { listDriverChatThreads } from "@/lib/trip-chat";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

function getDriverFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      type: string;
    };
    if (decoded.type !== "driver") return null;
    return decoded;
  } catch {
    return null;
  }
}

/** Driver inbox: active (non soft-hidden) chat threads + total unread. */
export async function GET(req: NextRequest) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const data = await listDriverChatThreads(tokenData.id);
    return NextResponse.json({
      success: true,
      threads: data.threads,
      totalUnread: data.totalUnread,
    });
  } catch (error) {
    console.error("[driver chat threads]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load inbox" },
      { status: 500 }
    );
  }
}
