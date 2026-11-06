// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { refreshConnectStatusForDriver } from "@/lib/stripe-connect";

/**
 * GET /api/driver/connect/return?d=<driverId>
 *   Stripe lands the driver here after they finish (or cancel) onboarding. We pull the
 *   latest account state, mirror it onto the driver row, and render a tiny HTML page
 *   the app's WebBrowser can detect to close itself.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const driverId = url.searchParams.get("d");

  let status: string | null = null;
  if (driverId) {
    try {
      const snap = await refreshConnectStatusForDriver(driverId, "stripe_return");
      status = snap.status;
    } catch (e) {
      console.error("[driver connect return] refresh failed", e);
    }
  }

  const label =
    status === "ENABLED"
      ? "Bank setup complete"
      : status === "PENDING"
        ? "We're verifying your details"
        : status === "RESTRICTED"
          ? "Action needed from Stripe"
          : "Onboarding closed";

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${label} — SARJ Worldwide</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #141416;
        color: #fff;
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        text-align: center;
      }
      .card {
        max-width: 420px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        padding: 32px 28px;
        border-radius: 20px;
      }
      h1 { font-size: 22px; margin: 0 0 8px; color: #C9A063; }
      p  { color: rgba(255,255,255,0.72); font-size: 14px; line-height: 1.5; margin: 0 0 20px; }
      a {
        display: inline-block;
        padding: 12px 20px;
        border-radius: 10px;
        background: #C9A063;
        color: #1a1a1a;
        text-decoration: none;
        font-weight: 600;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${label}</h1>
      <p>You can close this window and return to the SARJ driver app.</p>
      <a href="sarjworldwide://driver/profile?connectStatus=${encodeURIComponent(status || "unknown")}">Back to app</a>
    </div>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
