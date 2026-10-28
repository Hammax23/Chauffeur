import { Linking, Platform } from "react-native";

export type NavDestination = {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  /** Shown in Apple Maps as destination label when available. */
  label?: string | null;
};

function hasCoords(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Open system turn-by-turn navigation to a destination.
 * Prefers lat/lng; falls back to address query.
 */
export async function openNavigationTo(
  dest: NavDestination
): Promise<boolean> {
  const label = (dest.label || dest.address || "Destination").trim();
  const address = (dest.address || "").trim();
  const coords = hasCoords(dest.lat, dest.lng);

  let url: string | null = null;

  if (Platform.OS === "ios") {
    if (coords) {
      const q = encodeURIComponent(label);
      url = `http://maps.apple.com/?daddr=${dest.lat},${dest.lng}&q=${q}&dirflg=d`;
    } else if (address) {
      url = `http://maps.apple.com/?daddr=${encodeURIComponent(address)}&dirflg=d`;
    }
  } else {
    if (coords) {
      url = `google.navigation:q=${dest.lat},${dest.lng}`;
    } else if (address) {
      url = `google.navigation:q=${encodeURIComponent(address)}`;
    }
  }

  if (!url) return false;

  try {
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
      return true;
    }
  } catch {
    /* fall through to https Maps */
  }

  // Universal fallback (works if native scheme blocked)
  const web =
    coords
      ? `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`
      : address
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
        : null;
  if (!web) return false;
  try {
    await Linking.openURL(web);
    return true;
  } catch {
    return false;
  }
}
