import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { subscribeDriver, type DriverOfferEvent } from "@/lib/driver-bus";
import { listOpenOffersForDriver } from "@/lib/live-auto";

/**
 * Long-lived SSE feed for one driver (Live Auto Mode offers).
 * Frames: event "offer" with DriverOfferEvent JSON.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

const HEARTBEAT_MS = 15_000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

function getDriverIdFromRequest(req: NextRequest): string | null {
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
    if (decoded.type !== "driver") return null;
    return decoded.id;
  } catch {
    return null;
  }
}

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const driverId = getDriverIdFromRequest(req);
  if (!driverId) {
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

      safeEnqueue(`retry: 1500\n\n`);

      try {
        const openOffers = await listOpenOffersForDriver(driverId);
        const now = new Date().toISOString();
        for (const ride of openOffers) {
          const snap: DriverOfferEvent = {
            type: "snapshot",
            bookingId: ride.bookingId,
            serverTime: now,
            ride,
          };
          safeEnqueue(sseFrame("offer", snap));
        }

        // Also snapshot manually assigned PENDING requests
        const assigned = await prisma.reservation.findMany({
          where: { assignedDriverId: driverId, status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 20,
        });
        for (const r of assigned) {
          const snap: DriverOfferEvent = {
            type: "snapshot",
            bookingId: r.bookingId,
            serverTime: now,
            ride: {
              bookingId: r.bookingId,
              status: r.status,
              customerName: `${r.firstName} ${r.lastName}`.trim(),
              phone: r.phone,
              email: r.email,
              serviceType: r.serviceType,
              vehicle: r.vehicle,
              passengers: r.passengers,
              childSeats: r.childSeats,
              serviceDate: r.serviceDate,
              serviceTime: r.serviceTime,
              pickupLocation: r.pickupLocation,
              stops: r.stops || "",
              dropoffLocation: r.dropoffLocation,
              distance: r.distance || "",
              duration: r.duration || "",
              total: r.total,
              specialRequirements: r.specialRequirements || "",
              createdAt: r.createdAt.toISOString(),
              liveOffer: false,
            },
          };
          safeEnqueue(sseFrame("offer", snap));
        }
      } catch (err) {
        console.error("[driver-stream] snapshot error:", err);
      }

      const unsubscribe = subscribeDriver(driverId, (event) => {
        safeEnqueue(sseFrame("offer", event));
      });

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
