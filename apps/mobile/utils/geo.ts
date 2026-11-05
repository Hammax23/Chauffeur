/** Earth-surface distance in meters (WGS84 sphere). */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Approximate distance from a point to the nearest segment on a polyline.
 * Good enough for off-route detection (Uber-style refresh gate).
 */
export function distanceToPolylineMeters(
  point: { lat: number; lng: number },
  line: { latitude: number; longitude: number }[]
): number {
  if (line.length === 0) return Number.POSITIVE_INFINITY;
  if (line.length === 1) {
    return haversineMeters(point, {
      lat: line[0].latitude,
      lng: line[0].longitude,
    });
  }

  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < line.length - 1; i++) {
    const a = { lat: line[i].latitude, lng: line[i].longitude };
    const b = { lat: line[i + 1].latitude, lng: line[i + 1].longitude };
    min = Math.min(min, distanceToSegmentMeters(point, a, b));
  }
  return min;
}

function distanceToSegmentMeters(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  // Equirectangular projection around the segment for a cheap closest-point.
  const toRad = (d: number) => (d * Math.PI) / 180;
  const lat0 = toRad((a.lat + b.lat) / 2);
  const cosLat = Math.cos(lat0) || 1e-6;
  const ax = toRad(a.lng) * cosLat;
  const ay = toRad(a.lat);
  const bx = toRad(b.lng) * cosLat;
  const by = toRad(b.lat);
  const px = toRad(p.lng) * cosLat;
  const py = toRad(p.lat);
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = 0;
  if (len2 > 0) {
    t = ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
  }
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const closest = {
    lat: (cy * 180) / Math.PI,
    lng: (cx * 180) / (Math.PI * cosLat),
  };
  return haversineMeters(p, closest);
}
