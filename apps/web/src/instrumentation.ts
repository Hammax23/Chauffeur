/**
 * Next.js instrumentation — runs once when the Node server starts.
 * Warms the Postgres LISTEN connection so live SSE is ready before traffic.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  try {
    const { warmCrossProcessBus } = await import("@/lib/cross-process-bus");
    warmCrossProcessBus();
  } catch (err) {
    console.error("[instrumentation] warmCrossProcessBus failed:", err);
  }
}
