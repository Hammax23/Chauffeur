import * as SecureStore from "expo-secure-store";
import {
  getSavedPlaces as apiGetSavedPlaces,
  upsertSavedPlace as apiUpsertSavedPlace,
  deleteSavedPlace as apiDeleteSavedPlace,
  type SavedPlaceKind as ApiSavedPlaceKind,
} from "../services/api";

/**
 * Enterprise saved places: source of truth is the backend (synced across
 * devices, survives reinstall). SecureStore is used as an offline cache so the
 * Home screen chips render instantly and keep working without a connection.
 */

export type SavedPlaceKind = "home" | "office";

export type SavedPlace = {
  address: string;
  lat?: number;
  lng?: number;
};

export type SavedPlacesMap = {
  home: SavedPlace | null;
  office: SavedPlace | null;
};

const KEYS: Record<SavedPlaceKind, string> = {
  home: "sarj.place.home",
  office: "sarj.place.office",
};

const ALL_KINDS: SavedPlaceKind[] = ["home", "office"];

function toApiKind(kind: SavedPlaceKind): ApiSavedPlaceKind {
  return kind === "home" ? "HOME" : "OFFICE";
}

function fromApiKind(kind: string): SavedPlaceKind | null {
  const k = String(kind || "").toUpperCase();
  if (k === "HOME") return "home";
  if (k === "OFFICE") return "office";
  return null;
}

function normalizePlace(raw: unknown): SavedPlace | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { address?: unknown; lat?: unknown; lng?: unknown };
  const address = String(obj.address || "").trim();
  if (!address) return null;
  const lat = typeof obj.lat === "number" ? obj.lat : undefined;
  const lng = typeof obj.lng === "number" ? obj.lng : undefined;
  return { address, lat, lng };
}

// ---------- local cache ----------

async function readCache(kind: SavedPlaceKind): Promise<SavedPlace | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEYS[kind]);
    if (!raw?.trim()) return null;
    return normalizePlace(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeCache(kind: SavedPlaceKind, place: SavedPlace | null): Promise<void> {
  try {
    if (!place) {
      await SecureStore.deleteItemAsync(KEYS[kind]);
      return;
    }
    const payload: SavedPlace = { address: place.address };
    if (typeof place.lat === "number" && typeof place.lng === "number") {
      payload.lat = place.lat;
      payload.lng = place.lng;
    }
    await SecureStore.setItemAsync(KEYS[kind], JSON.stringify(payload));
  } catch {
    /* ignore cache write failures */
  }
}

// ---------- public API ----------

/** Cache-first read of a single saved place (instant, offline-safe). */
export async function getSavedPlace(kind: SavedPlaceKind): Promise<SavedPlace | null> {
  return readCache(kind);
}

/**
 * Fetch every saved place from the backend and refresh the local cache.
 * Falls back to the cached values if the request fails (offline).
 */
export async function getAllSavedPlaces(): Promise<SavedPlacesMap> {
  try {
    const res = await apiGetSavedPlaces();
    if (res?.success && Array.isArray(res.places)) {
      const map: SavedPlacesMap = { home: null, office: null };
      for (const row of res.places) {
        const kind = fromApiKind(row.kind);
        if (!kind) continue;
        const place = normalizePlace({
          address: row.address,
          lat: row.lat ?? undefined,
          lng: row.lng ?? undefined,
        });
        map[kind] = place;
      }
      // Sync cache to match server (including removals).
      await Promise.all(ALL_KINDS.map((k) => writeCache(k, map[k])));
      return map;
    }
  } catch {
    /* fall through to cache */
  }
  const [home, office] = await Promise.all([readCache("home"), readCache("office")]);
  return { home, office };
}

/**
 * Save a place to the backend and update the local cache. Throws if the
 * backend rejects the write so callers can surface an error to the user.
 */
export async function setSavedPlace(kind: SavedPlaceKind, place: SavedPlace): Promise<void> {
  const address = String(place.address || "").trim();
  if (!address) {
    await clearSavedPlace(kind);
    return;
  }
  const hasCoords = typeof place.lat === "number" && typeof place.lng === "number";
  const res = await apiUpsertSavedPlace({
    kind: toApiKind(kind),
    address,
    lat: hasCoords ? place.lat : undefined,
    lng: hasCoords ? place.lng : undefined,
  });
  if (!res?.success) {
    throw new Error(res?.error || "Failed to save place");
  }
  await writeCache(kind, {
    address,
    ...(hasCoords ? { lat: place.lat, lng: place.lng } : {}),
  });
}

/** Remove a place from the backend and the local cache. */
export async function clearSavedPlace(kind: SavedPlaceKind): Promise<void> {
  try {
    await apiDeleteSavedPlace(toApiKind(kind));
  } catch {
    /* best effort — still clear local cache below */
  }
  await writeCache(kind, null);
}
