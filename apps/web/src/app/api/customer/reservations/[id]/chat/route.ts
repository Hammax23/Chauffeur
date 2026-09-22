import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  isCustomerTripHistoryLocked,
  listMessagesForBooking,
  postChatMessage,
} from "@/lib/trip-chat";
import {
  getActiveCustomerFromRequest,
  customerAuthFailurePayload,
} from "@/lib/customer-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }

    const { id: bookingId } = await params;
    const ride = await prisma.reservation.findFirst({
      where: { bookingId, customerId: auth.customer.id },
      select: { bookingId: true },
    });
    if (!ride) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }

    const since = req.nextUrl.searchParams.get("since") ?? undefined;
    const data = await listMessagesForBooking(bookingId, { since });
    // History: do not expose prior chat transcript to the customer.
    if (isCustomerTripHistoryLocked(data.status)) {
      return NextResponse.json({
        success: true,
        threadId: data.threadId,
        messages: [],
        canSend: false,
        status: data.status,
      });
    }
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
    }
    console.error("Customer chat GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to load chat" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }

    const { id: bookingId } = await params;
    const body = await req.json();
    const text = typeof body?.body === "string" ? body.body : "";

    const message = await postChatMessage({
      bookingId,
      senderType: "CUSTOMER",
      senderId: auth.customer.id,
      body: text,
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 });
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
    console.error("Customer chat POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
  }
}
