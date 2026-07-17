import { NextRequest } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { subscribeOpsLiveAuto, type DriverOfferEvent } from "@/lib/driver-bus";
import { getLiveAutoDashboard } from "@/lib/live-auto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

const HEARTBEAT_MS = 20_000;

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) {
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

      safeEnqueue(`retry: 3000\n\n`);

      try {
        const dash = await getLiveAutoDashboard();
        safeEnqueue(
          sseFrame("dashboard", {
            type: "snapshot",
            serverTime: new Date().toISOString(),
            ...dash,
          })
        );
      } catch (err) {
        console.error("[ops-live-auto-stream] snapshot:", err);
      }

      const unsubscribe = subscribeOpsLiveAuto((event: DriverOfferEvent) => {
        safeEnqueue(sseFrame("offer", event));
      });

      const heartbeat = setInterval(() => {
        safeEnqueue(`: keep-alive ${Date.now()}\n\n`);
      }, HEARTBEAT_MS);

      // Periodic dashboard refresh so stats stay accurate without client poll
      const refresh = setInterval(async () => {
        try {
          const dash = await getLiveAutoDashboard();
          safeEnqueue(
            sseFrame("dashboard", {
              type: "snapshot",
              serverTime: new Date().toISOString(),
              ...dash,
            })
          );
        } catch {
          /* ignore */
        }
      }, 8_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(refresh);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* */
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
