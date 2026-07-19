import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import {
  loadReservationLiveDataMany,
  subscribeCustomer,
  type ReservationEvent,
} from "@/lib/realtime-bus";

/**
 * Long-lived SSE feed for one customer.
 *
 * Pushes a `reservation` event for every change to ANY reservation owned by
 * the authenticated customer (status changes, driver assigned, new booking,
 * cancellation, etc). The mobile reservations list subscribes to this so it
 * can stay live without per-row connections.
 *
 * Headers + heartbeat strategy mirror the per-reservation stream so behaviour
 * is consistent behind nginx / Cloudflare.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

const HEARTBEAT_MS = 15_000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";
/** Cap how many initial snapshots we replay; older bookings are still fetched on next list refresh. */
const SNAPSHOT_LIMIT = 30;

function getCustomerIdFromRequest(req: NextRequest): string | null {
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
    return decoded.id;
  } catch {
    return null;
  }
}

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const customerId = getCustomerIdFromRequest(req);
  if (!customerId) {
    return new Response("Unauthorized", { status: 401 });
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

      // Hint to browsers / EventSource clients about retry; harmless to others.
      safeEnqueue(`retry: 2000\n\n`);

      // Initial snapshot — one batched query (not N× loadReservationLiveData).
      try {
        const recent = await prisma.reservation.findMany({
          where: { customerId },
          orderBy: { createdAt: "desc" },
          take: SNAPSHOT_LIMIT,
          select: { bookingId: true },
        });
        const snapshots = await loadReservationLiveDataMany(
          recent.map((row) => row.bookingId)
        );
        const now = new Date().toISOString();
        for (const data of snapshots) {
          const snap: ReservationEvent = {
            type: "snapshot",
            bookingId: data.bookingId,
            serverTime: now,
            data,
          };
          safeEnqueue(sseFrame("reservation", snap));
        }
      } catch (err) {
        console.error("[customer-stream] snapshot error:", err);
      }

      // Live updates for any reservation owned by this customer
      const unsubscribe = subscribeCustomer(customerId, (event) => {
        safeEnqueue(sseFrame("reservation", event));
      });

      // Keep-alive comment so proxies and the OS network stack don't idle the
      // connection.
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
