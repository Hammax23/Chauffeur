import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import {
  loadReservationLiveData,
  subscribeReservation,
  type ReservationEvent,
} from "@/lib/realtime-bus";

/**
 * Long-lived Server-Sent Events stream for a single reservation.
 *
 * Behavior:
 *   • Verifies a customer JWT (Authorization: Bearer ...).
 *   • Verifies the customer owns the reservation.
 *   • Sends an initial `snapshot` event with the current state.
 *   • Subscribes to the in-process realtime bus and forwards every reservation
 *     event to the client.
 *   • Sends a comment heartbeat every HEARTBEAT_MS to keep proxies and the OS
 *     network stack from idling the connection out.
 *   • Cleans up immediately when the client disconnects (req.signal aborted).
 *
 * Headers chosen for compatibility behind nginx / Cloudflare:
 *   Cache-Control: no-cache, no-transform
 *   Connection: keep-alive
 *   X-Accel-Buffering: no    (disables nginx response buffering for SSE)
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

const HEARTBEAT_MS = 20_000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

function getCustomerIdFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  let token: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice("Bearer ".length).trim();
  } else {
    // Fallback: token in querystring for clients that can't set headers (rare;
    // some legacy SSE consumers). The mobile app uses Authorization headers.
    token = req.nextUrl.searchParams.get("token");
  }
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; type: string };
    if (decoded.type !== "customer") return null;
    return decoded.id;
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
  const customerId = getCustomerIdFromRequest(req);
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

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      // Initial connection comment + retry hint (browsers honor this; harmless to others).
      safeEnqueue(`retry: 3000\n\n`);

      // Initial snapshot from DB
      try {
        const data = await loadReservationLiveData(bookingId);
        if (data) {
          const snapshot: ReservationEvent = {
            type: "snapshot",
            bookingId,
            serverTime: new Date().toISOString(),
            data,
          };
          safeEnqueue(sseFrame("reservation", snapshot));
        }
      } catch (err) {
        console.error("[reservation-stream] snapshot error:", err);
      }

      // Live updates
      const unsubscribe = subscribeReservation(bookingId, (event) => {
        safeEnqueue(sseFrame("reservation", event));
      });

      // Heartbeat (SSE comment line — clients ignore it but the connection stays warm)
      const heartbeat = setInterval(() => {
        safeEnqueue(`: keep-alive ${Date.now()}\n\n`);
      }, HEARTBEAT_MS);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Client disconnect
      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
