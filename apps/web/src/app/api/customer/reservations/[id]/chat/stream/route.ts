import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { subscribeChat, type ChatEvent } from "@/lib/chat-bus";
import { listMessagesForBooking, isCustomerTripHistoryLocked } from "@/lib/trip-chat";
import { isCustomerInactive } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

const HEARTBEAT_MS = 15_000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

async function getActiveCustomerIdFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  let token: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice("Bearer ".length).trim();
  } else {
    token = req.nextUrl.searchParams.get("token");
  }
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; type: string };
    if (decoded.type !== "customer") return null;
    const customer = await prisma.customer.findUnique({
      where: { id: decoded.id },
      select: { id: true, accountStatus: true },
    });
    if (!customer || isCustomerInactive(customer)) return null;
    return customer.id;
  } catch {
    return null;
  }
}

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const customerId = await getActiveCustomerIdFromRequest(req);
  if (!customerId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: bookingId } = await params;
  const owns = await prisma.reservation.findFirst({
    where: { bookingId, customerId },
    select: { id: true },
  });
  if (!owns) {
    return new Response("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseFrame(event, data)));
        } catch {
          /* closed */
        }
      };

      try {
        controller.enqueue(encoder.encode(`retry: 1500\n\n`));
      } catch {
        /* closed */
      }

      let historyLocked = false;
      try {
        const snapshot = await listMessagesForBooking(bookingId);
        historyLocked = isCustomerTripHistoryLocked(snapshot.status);
        if (historyLocked) {
          send("snapshot", {
            threadId: snapshot.threadId,
            messages: [],
            canSend: false,
            status: snapshot.status,
          });
        } else {
          send("snapshot", snapshot);
        }
      } catch {
        send("snapshot", { threadId: null, messages: [], canSend: false, status: "UNKNOWN" });
      }

      const onEvent = (event: ChatEvent) => {
        if (historyLocked) return;
        send("message", event);
      };
      cleanup = historyLocked ? null : subscribeChat(bookingId, onEvent);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, HEARTBEAT_MS);

      const abort = () => {
        clearInterval(heartbeat);
        cleanup?.();
        cleanup = null;
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      req.signal.addEventListener("abort", abort);
    },
    cancel() {
      cleanup?.();
      cleanup = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
