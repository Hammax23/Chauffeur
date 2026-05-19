import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Proxy endpoint for Google Maps Static API.
 *
 * Why proxy:
 *   • Keeps the API key server-side. The mobile app never sees it.
 *   • Lets us cap image dimensions, apply a consistent style, and cache
 *     responses behind a CDN-friendly Cache-Control header.
 *
 * Inputs (query string):
 *   polyline=<encoded>       — optional, drawn as a gold path
 *   markers=A:lat,lng;B:lat,lng[;C:lat,lng]
 *                            — labelled markers (single char label)
 *   w, h                     — image size in CSS pixels (clamped)
 *
 * Renders at scale=2 for retina sharpness on iOS / Android.
 */

function resolveMapsKey(): string | undefined {
  const server = process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
  if (server) return server;
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

const SAFE_LATLNG = /^-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?$/;
const SAFE_LABEL = /^[A-Z]$/;

export async function GET(req: NextRequest) {
  const key = resolveMapsKey();
  if (!key) {
    return new Response("Maps API is not configured on the server.", { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const polyline = (searchParams.get("polyline") || "").trim();
  const markersRaw = (searchParams.get("markers") || "").trim();
  const widthIn = parseInt(searchParams.get("w") || "640", 10);
  const heightIn = parseInt(searchParams.get("h") || "280", 10);
  const width = Math.min(1200, Math.max(200, Number.isFinite(widthIn) ? widthIn : 640));
  const height = Math.min(800, Math.max(120, Number.isFinite(heightIn) ? heightIn : 280));

  const params = new URLSearchParams({
    size: `${width}x${height}`,
    scale: "2",
    maptype: "roadmap",
    language: "en",
    region: "ca",
    key,
  });

  // Gold polyline drawn beneath markers
  if (polyline.length > 0 && polyline.length < 8192) {
    params.append("path", `weight:5|color:0xC9A063FF|enc:${polyline}`);
  }

  // Parse markers, e.g. "A:43.6,-79.3;B:43.7,-79.4;C:43.8,-79.5"
  if (markersRaw) {
    for (const segment of markersRaw.split(";")) {
      const [label, latLng] = segment.split(":");
      if (!label || !latLng) continue;
      const safeLabel = label.toUpperCase();
      if (!SAFE_LABEL.test(safeLabel)) continue;
      if (!SAFE_LATLNG.test(latLng.trim())) continue;
      // Use the deep slate color from the customer app palette for a premium feel.
      params.append("markers", `color:0x0F172AFF|label:${safeLabel}|${latLng.trim()}`);
    }
  }

  // Style: subdue points of interest + transit labels so the route is the hero.
  const styles = [
    "feature:poi|element:labels|visibility:off",
    "feature:transit|element:labels|visibility:off",
    "feature:administrative.land_parcel|visibility:off",
    "feature:road.local|element:labels|visibility:simplified",
  ];
  for (const s of styles) params.append("style", s);

  const url = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return new Response(text || "Map unavailable", { status: res.status });
    }
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("Content-Type") || "image/png";
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  } catch {
    return new Response("Could not reach Google Maps.", { status: 502 });
  }
}
