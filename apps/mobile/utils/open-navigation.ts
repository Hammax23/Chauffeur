import { Linking, Platform } from "react-native";

export type NavDestination = {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  /** Shown as destination label when the maps app supports it. */
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

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Prefer canOpenURL for custom schemes (requires LSApplicationQueriesSchemes).
 * For https, open even when canOpenURL is false (common on iOS).
 */
async function tryOpenUrl(url: string): Promise<boolean> {
  try {
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
      return true;
    }
    if (isHttpUrl(url)) {
      await Linking.openURL(url);
      return true;
    }
  } catch {
    if (isHttpUrl(url)) {
      try {
        await Linking.openURL(url);
        return true;
      } catch {
        return false;
      }
    }
  }
  return false;
}

function googleDirUniversal(opts: {
  lat?: number;
  lng?: number;
  address?: string;
}): string | null {
  if (opts.lat != null && opts.lng != null) {
    return (
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${opts.lat},${opts.lng}` +
      `&travelmode=driving&dir_action=navigate`
    );
  }
  const address = (opts.address || "").trim();
  if (!address) return null;
  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${encodeURIComponent(address)}` +
    `&travelmode=driving&dir_action=navigate`
  );
}

/**
 * Open turn-by-turn navigation to a destination.
 * Prefers Google Maps (driving + start navigation), coords over address.
 * iOS: Google app → Google universal URL → Apple Maps driving.
 * Android: google.navigation → Google universal URL.
 */
export async function openNavigationTo(
  dest: NavDestination
): Promise<boolean> {
  const label = (dest.label || dest.address || "Destination").trim();
  const address = (dest.address || "").trim();
  const coords = hasCoords(dest.lat, dest.lng);
  const lat = coords ? (dest.lat as number) : undefined;
  const lng = coords ? (dest.lng as number) : undefined;

  if (!coords && !address) return false;

  const universal = googleDirUniversal({
    lat,
    lng,
    address: coords ? undefined : address,
  });

  if (Platform.OS === "ios") {
    if (coords && lat != null && lng != null) {
      const googleApp =
        `comgooglemaps://?daddr=${lat},${lng}` +
        `&q=${encodeURIComponent(label)}&directionsmode=driving`;
      if (await tryOpenUrl(googleApp)) return true;
    } else if (address) {
      const googleApp =
        `comgooglemaps://?daddr=${encodeURIComponent(address)}` +
        `&directionsmode=driving`;
      if (await tryOpenUrl(googleApp)) return true;
    }

    if (universal && (await tryOpenUrl(universal))) return true;

    if (coords && lat != null && lng != null) {
      const apple =
        `http://maps.apple.com/?daddr=${lat},${lng}` +
        `&q=${encodeURIComponent(label)}&dirflg=d`;
      if (await tryOpenUrl(apple)) return true;
    } else if (address) {
      const apple =
        `http://maps.apple.com/?daddr=${encodeURIComponent(address)}&dirflg=d`;
      if (await tryOpenUrl(apple)) return true;
    }
    return false;
  }

  // Android — live TBT from device GPS.
  // Prefer direct openURL: canOpenURL is unreliable for intent schemes
  // without manifest package queries on newer Android.
  const androidNav =
    coords && lat != null && lng != null
      ? `google.navigation:q=${lat},${lng}&mode=d`
      : address
        ? `google.navigation:q=${encodeURIComponent(address)}&mode=d`
        : null;
  if (androidNav) {
    try {
      await Linking.openURL(androidNav);
      return true;
    } catch {
      /* fall through to universal Google Maps URL */
    }
  }

  if (universal && (await tryOpenUrl(universal))) return true;
  return false;
}
