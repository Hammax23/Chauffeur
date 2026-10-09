import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Proxy endpoint for Google Maps Static API.
 *
 * Uber-style muted silver basemap + bold ink route so the trip path is the hero.
 * Key stays server-side; mobile never sees it.
 *
 * Inputs (query string):
 *   polyline=<encoded>       — optional, drawn as dual-stroke route
 *   markers=A:lat,lng;B:lat,lng[;C:lat,lng]
 *   w, h                     — image size in CSS pixels (clamped)
 *   pad=hero                 — inset A/B so floating chrome/chips don’t cover pins
 *
 * Renders at scale=2 for retina sharpness.
 */

function resolveMapsKey(): string | undefined {
  const server = process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
  if (server) return server;
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

const SAFE_LATLNG = /^-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?$/;
const SAFE_LABEL = /^[A-Z]$/;

/** Desaturated “rideshare light” map — hides clutter, keeps streets readable. */
const UBER_LIGHT_STYLES = [
  "feature:all|element:labels.text.fill|color:0x6b7280",
  "feature:all|element:labels.text.stroke|color:0xffffff",
  "feature:administrative|element:geometry.stroke|color:0xd1d5db",
  "feature:administrative.land_parcel|visibility:off",
  "feature:administrative.neighborhood|visibility:off",
  "feature:landscape|element:geometry|color:0xf3f4f6",
  "feature:landscape.man_made|element:geometry|color:0xeeeeee",
  "feature:poi|visibility:off",
  "feature:poi.park|element:geometry.fill|color:0xe5e7eb",
  "feature:poi.park|element:labels|visibility:off",
  "feature:road|element:geometry.fill|color:0xffffff",
  "feature:road|element:geometry.stroke|color:0xe5e7eb",
  "feature:road|element:labels.icon|visibility:off",
  "feature:road.arterial|element:geometry.fill|color:0xffffff",
  "feature:road.highway|element:geometry.fill|color:0xe5e7eb",
  "feature:road.highway|element:geometry.stroke|color:0xd1d5db",
  "feature:road.highway|element:labels.text.fill|color:0x6b7280",
  "feature:road.local|element:labels|visibility:simplified",
  "feature:transit|visibility:off",
  "feature:water|element:geometry.fill|color:0xdbeafe",
  "feature:water|element:labels.text.fill|color:0x93c5fd",
];

type LatLng = { lat: number; lng: number };

/** Google encoded polyline → points (enough samples for bounds). */
function decodePolyline(encoded: string, maxPoints = 400): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const len = encoded.length;

  while (index < len && points.length < maxPoints) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < len);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < len);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

/**
 * Expand geographic bounds so content sits in the inner viewport band.
 * Fractions are of the *final* map frame (0–0.4 each side).
 */
function padBounds(
  points: LatLng[],
  pad: { top: number; bottom: number; left: number; right: number }
): { sw: LatLng; ne: LatLng } | null {
  if (points.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  if (!Number.isFinite(minLat)) return null;

  const latSpan = Math.max(maxLat - minLat, 0.012);
  const lngSpan = Math.max(maxLng - minLng, 0.012);
  const vDenom = Math.max(0.25, 1 - pad.top - pad.bottom);
  const hDenom = Math.max(0.25, 1 - pad.left - pad.right);

  return {
    sw: {
      lat: minLat - latSpan * (pad.bottom / vDenom),
      lng: minLng - lngSpan * (pad.left / hDenom),
    },
    ne: {
      lat: maxLat + latSpan * (pad.top / vDenom),
      lng: maxLng + lngSpan * (pad.right / hDenom),
    },
  };
}

export async function GET(req: NextRequest) {
  const key = resolveMapsKey();
  if (!key) {
    return new Response("Maps API is not configured on the server.", { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const polyline = (searchParams.get("polyline") || "").trim();
  const markersRaw = (searchParams.get("markers") || "").trim();
  const padMode = (searchParams.get("pad") || "").trim().toLowerCase();
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

  // Dual-stroke route (Uber-like): soft outer halo + bold ink core.
  if (polyline.length > 0 && polyline.length < 8192) {
    params.append("path", `weight:10|color:0xFFFFFFCC|enc:${polyline}`);
    params.append("path", `weight:5|color:0x1C1916FF|enc:${polyline}`);
  }

  const markerPoints: LatLng[] = [];

  // Markers: A (pickup) gold, later stops/dropoff deep ink — matches SARJ / Uber pins.
  if (markersRaw) {
    for (const segment of markersRaw.split(";")) {
      const [label, latLng] = segment.split(":");
      if (!label || !latLng) continue;
      const safeLabel = label.toUpperCase();
      if (!SAFE_LABEL.test(safeLabel)) continue;
      if (!SAFE_LATLNG.test(latLng.trim())) continue;
      const color = safeLabel === "A" ? "0xC9A063FF" : "0x1C1916FF";
      params.append("markers", `color:${color}|size:mid|label:${safeLabel}|${latLng.trim()}`);
      const [latS, lngS] = latLng.trim().split(",");
      const lat = Number(latS);
      const lng = Number(lngS);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        markerPoints.push({ lat, lng });
      }
    }
  }

  // Pull A/B (and route) inward so header / profile / chips don’t cover pins.
  if (padMode === "hero" && (markerPoints.length >= 1 || polyline.length > 0)) {
    const routePts =
      polyline.length > 0 && polyline.length < 8192 ? decodePolyline(polyline) : [];
    const boundsPts = routePts.length > 0 ? routePts : markerPoints;
    const padded = padBounds(boundsPts, {
      top: 0.26,
      bottom: 0.3,
      left: 0.16,
      right: 0.18,
    });
    if (padded) {
      const fmt = (n: number) => n.toFixed(6);
      params.append(
        "visible",
        `${fmt(padded.sw.lat)},${fmt(padded.sw.lng)}|${fmt(padded.ne.lat)},${fmt(padded.ne.lng)}`
      );
    }
  }

  for (const s of UBER_LIGHT_STYLES) params.append("style", s);

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
