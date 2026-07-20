/**
 * Next.js instrumentation — process boot hook.
 *
 * Do NOT import `pg` / cross-process-bus here. Next still webpack-bundles
 * instrumentation, and `pg` (via pgpass) needs Node built-ins that the
 * instrumentation graph cannot resolve.
 *
 * Postgres LISTEN for the live bus starts lazily on the first SSE
 * `subscribeCrossBus()` in this process (see cross-process-bus.ts).
 * That is the correct boundary: only workers with live subscribers listen.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
}
