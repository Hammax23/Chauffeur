import { haversineMeters } from "./geo";

/** Pickup-first until customer is in car (or mid-trip stop / done). */
export function isTowardDropoff(status: string): boolean {
  return status === "CIC" || status === "STOP" || status === "DONE";
}

export type PhaseNavTarget = {
  kind: "pick" | "drop";
  lat?: number;
  lng?: number;
  address: string;
  label: string;
};

function shortLoc(s?: string | null): string {
  if (!s?.trim()) return "Destination";
  return s.split(",")[0]?.trim() || s.trim();
}

function hasCoordPair(
  lat?: number | null,
  lng?: number | null
): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

/**
 * Active navigation / map destination for the current ride status.
 * Prefers booking Places lat/lng; drops identical pickup≈dropoff pins (bad data)
 * so Directions can use the address string instead of a zero-length trip.
 */
export function getRidePhaseDestination(ride: {
  status: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
}): PhaseNavTarget | null {
  const toward = isTowardDropoff(ride.status);
  const pickOk = hasCoordPair(ride.pickupLat, ride.pickupLng);
  const dropOk = hasCoordPair(ride.dropoffLat, ride.dropoffLng);

  const pinsCollapsed =
    pickOk &&
    dropOk &&
    haversineMeters(
      { lat: ride.pickupLat!, lng: ride.pickupLng! },
      { lat: ride.dropoffLat!, lng: ride.dropoffLng! }
    ) < 40;

  if (toward) {
    const address = (ride.dropoffLocation || "").trim();
    if (!address && !dropOk) return null;
    if (pinsCollapsed || !dropOk) {
      if (!address) return null;
      return {
        kind: "drop",
        address,
        label: shortLoc(address),
      };
    }
    return {
      kind: "drop",
      lat: ride.dropoffLat!,
      lng: ride.dropoffLng!,
      address: address || shortLoc(ride.dropoffLocation),
      label: shortLoc(ride.dropoffLocation),
    };
  }

  const address = (ride.pickupLocation || "").trim();
  if (!address && !pickOk) return null;
  if (pinsCollapsed || !pickOk) {
    if (!address) return null;
    return {
      kind: "pick",
      address,
      label: shortLoc(address),
    };
  }
  return {
    kind: "pick",
    lat: ride.pickupLat!,
    lng: ride.pickupLng!,
    address: address || shortLoc(ride.pickupLocation),
    label: shortLoc(ride.pickupLocation),
  };
}

/** Directions API origin/destination query: prefer precise lat,lng. */
export function phaseDestinationQuery(target: PhaseNavTarget): string {
  if (
    typeof target.lat === "number" &&
    typeof target.lng === "number" &&
    Number.isFinite(target.lat) &&
    Number.isFinite(target.lng)
  ) {
    return `${target.lat},${target.lng}`;
  }
  return target.address.trim();
}

export function phaseNavigateLabel(target: PhaseNavTarget): string {
  return target.kind === "drop" ? "Navigate to drop-off" : "Navigate to pickup";
}
