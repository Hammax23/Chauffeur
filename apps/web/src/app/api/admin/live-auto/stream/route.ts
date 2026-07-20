import { NextRequest } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { subscribeOpsLiveAuto, type DriverOfferEvent } from "@/lib/driver-bus";
import { getLiveAutoDashboard } from "@/lib/live-auto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

const HEARTBEAT_MS = 15_000;
/** Debounce dashboard DB refresh after offer events (was fixed 8s poll). */
const DASHBOARD_DEBOUNCE_MS = 400;
/** Safety net if no events arrive for a while. */
const DASHBOARD_IDLE_REFRESH_MS = 30_000;

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
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let refreshInFlight = false;

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const pushDashboard = async () => {
        if (closed || refreshInFlight) return;
        refreshInFlight = true;
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
          console.error("[ops-live-auto-stream] dashboard:", err);
        } finally {
          refreshInFlight = false;
        }
      };

      const scheduleDashboardRefresh = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          void pushDashboard();
        }, DASHBOARD_DEBOUNCE_MS);
      };

      safeEnqueue(`retry: 1500\n\n`);

      await pushDashboard();

      const unsubscribe = subscribeOpsLiveAuto((event: DriverOfferEvent) => {
        safeEnqueue(sseFrame("offer", event));
        // Event-driven stats refresh instead of hammering DB every 8s
        scheduleDashboardRefresh();
      });

      const heartbeat = setInterval(() => {
        safeEnqueue(`: keep-alive ${Date.now()}\n\n`);
      }, HEARTBEAT_MS);

      const idleRefresh = setInterval(() => {
        void pushDashboard();
      }, DASHBOARD_IDLE_REFRESH_MS);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        clearInterval(heartbeat);
        clearInterval(idleRefresh);
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
