import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { listMessagesForBooking, postChatMessage } from "@/lib/trip-chat";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

function getDriverFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; type: string };
    if (decoded.type !== "driver") return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;
    const ride = await prisma.reservation.findFirst({
      where: { bookingId, assignedDriverId: tokenData.id },
      select: { bookingId: true },
    });
    if (!ride) {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }

    const since = req.nextUrl.searchParams.get("since") ?? undefined;
    const data = await listMessagesForBooking(bookingId, { since });
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }
    console.error("Driver chat GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to load chat" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;
    const body = await req.json();
    const text = typeof body?.body === "string" ? body.body : "";

    const message = await postChatMessage({
      bookingId,
      senderType: "DRIVER",
      senderId: tokenData.id,
      body: text,
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Ride not found" }, { status: 404 });
    }
    if (code === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    if (code === "CHAT_CLOSED") {
      return NextResponse.json(
        { success: false, error: "Chat is closed for this ride" },
        { status: 400 }
      );
    }
    if (code === "EMPTY_BODY") {
      return NextResponse.json({ success: false, error: "Message cannot be empty" }, { status: 400 });
    }
    if (code === "BODY_TOO_LONG") {
      return NextResponse.json(
        { success: false, error: "Message is too long (max 2000 characters)" },
        { status: 400 }
      );
    }
    console.error("Driver chat POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
  }
}
