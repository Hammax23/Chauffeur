import type { AppFleetVehicleDto } from "../services/api";

/** Dispatch tier shown in reservation (matches client vehicle categories). */
export interface VehicleTierDefinition {
  id: string;
  title: string;
  /** Reservation rule shown under the title (Uber-style subtitle). */
  subtitle: string;
  group: "standard" | "executive";
  /** Fleet vehicle used for thumbnail image (legacy static map only). */
  representativeFleetId?: string;
  /** Override per-km rate when it differs from the representative vehicle. */
  pricePerKm?: number;
  /** Override hourly rate when it differs from the representative vehicle. */
  hourlyRate?: number;
}

/** Preferred Select Vehicle order + display titles (Create Reservation). */
export const TIER_DISPLAY_ORDER: string[] = [
  "only-black-sedan",
  "black-sedan",
  "black-suv",
  "exec-black-suv",
  "cadillac-escalade",
  "exec-black-sedan",
  "xlarge-suv",
  "electric-black-3",
  "sarj-pet-3",
  "mercedes-s-class",
  "exec-sprinter-van-14",
];

/** Force display titles even if API still has older names. */
export const TIER_DISPLAY_TITLES: Record<string, string> = {
  "only-black-sedan": "Black Sedan",
  "black-sedan": "Premier Black Car",
  "black-suv": "Premier SUV",
  "exec-black-suv": "Executive SUV",
  "cadillac-escalade": "Cadillac Escalade",
  "exec-black-sedan": "Executive Sedan",
  "xlarge-suv": "XLarge SUV",
  "electric-black-3": "Electric Car",
  "sarj-pet-3": "SARJ Pet",
  "mercedes-s-class": "Mercedes Benz S Class",
  "exec-sprinter-van-14": "Executive Sprinter",
};

/** Offline / empty-API fallback (kept in sync with admin seed defaults). */
export const VEHICLE_TIER_DEFINITIONS: VehicleTierDefinition[] = [
  {
    id: "only-black-sedan",
    title: "Black Sedan",
    subtitle: "Sedan only — no SUV swap",
    group: "standard",
    representativeFleetId: "cadillac-xts",
  },
  {
    id: "black-sedan",
    title: "Premier Black Car",
    subtitle: "Sedan or SUV — whichever is available",
    group: "standard",
    representativeFleetId: "cadillac-xts",
  },
  {
    id: "black-suv",
    title: "Premier SUV",
    subtitle: "Luxury SUV for up to 6",
    group: "standard",
    representativeFleetId: "chevrolet-suburban",
  },
  {
    id: "exec-black-suv",
    title: "Executive SUV",
    subtitle: "High-rated chauffeurs · SUV class",
    group: "executive",
    representativeFleetId: "chevrolet-suburban",
    pricePerKm: 5.5,
    hourlyRate: 295,
  },
  {
    id: "cadillac-escalade",
    title: "Cadillac Escalade",
    subtitle: "Escalade guaranteed · top-rated chauffeurs",
    group: "standard",
    representativeFleetId: "cadillac-escalade",
  },
  {
    id: "exec-black-sedan",
    title: "Executive Sedan",
    subtitle: "High-rated chauffeurs · sedan class",
    group: "executive",
    representativeFleetId: "mercedes-s-class",
  },
  {
    id: "xlarge-suv",
    title: "XLarge SUV",
    subtitle: "Extra-large SUV for groups",
    group: "standard",
    representativeFleetId: "gmc-yukon-xl",
  },
  {
    id: "electric-black-3",
    title: "Electric Car",
    subtitle: "Zero-emission vehicles",
    group: "standard",
    representativeFleetId: "cadillac-lyric",
  },
  {
    id: "sarj-pet-3",
    title: "SARJ Pet",
    subtitle: "You and your pet welcome",
    group: "standard",
    representativeFleetId: "cadillac-xts",
  },
  {
    id: "mercedes-s-class",
    title: "Mercedes Benz S Class",
    subtitle: "S-Class guaranteed · top-rated chauffeurs",
    group: "executive",
    representativeFleetId: "mercedes-s-class",
  },
  {
    id: "exec-sprinter-van-14",
    title: "Executive Sprinter",
    subtitle: "Group van for up to 14",
    group: "executive",
    representativeFleetId: "sprinter-van",
  },
];

export interface VehicleTierOption {
  id: string;
  title: string;
  subtitle: string;
  group: "standard" | "executive";
  imageUrl: string;
  pricePerKm: number;
  hourlyRate: number;
  baseDistanceKm?: number;
  extraKmRate?: number;
  description?: string;
  category?: string;
  seating?: string;
  luggage?: string;
  sortOrder?: number;
}

/** Map a home-screen fleet card id → reservation tier id. */
const FLEET_ID_TO_TIER: Record<string, string> = {
  "cadillac-xts": "black-sedan",
  "cadillac-lyric": "electric-black-3",
  "chevrolet-suburban": "black-suv",
  "cadillac-escalade": "cadillac-escalade",
  "mercedes-s-class": "mercedes-s-class",
  "sprinter-van": "exec-sprinter-van-14",
  "gmc-yukon-xl": "xlarge-suv",
};

export function resolveTierIdFromFleetVehicleId(fleetVehicleId: string): string {
  return FLEET_ID_TO_TIER[fleetVehicleId] ?? fleetVehicleId;
}

function displayTitleForTier(id: string, apiTitle: string): string {
  return TIER_DISPLAY_TITLES[id] || formatTierDisplayTitle(apiTitle);
}

function sortTiersForSelect(tiers: VehicleTierOption[]): VehicleTierOption[] {
  const rank = new Map(TIER_DISPLAY_ORDER.map((id, i) => [id, i]));
  return [...tiers].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id)! : 1000 + (a.sortOrder ?? 0);
    const rb = rank.has(b.id) ? rank.get(b.id)! : 1000 + (b.sortOrder ?? 0);
    if (ra !== rb) return ra - rb;
    return String(a.title).localeCompare(String(b.title));
  });
}

/** Preferred: map admin-managed app fleet rows into reservation tiers. */
export function buildVehicleTiersFromAppFleet(appFleet: AppFleetVehicleDto[]): VehicleTierOption[] {
  const mapped = appFleet
    .map((v) => {
      const id = v.tierId || v.id;
      return {
        id,
        title: displayTitleForTier(id, v.title),
        subtitle: v.subtitle || "",
        group: (v.group === "executive" ? "executive" : "standard") as "standard" | "executive",
        imageUrl: v.imageUrl || v.image || "",
        pricePerKm: v.pricePerKm,
        hourlyRate: v.hourlyRate ?? v.price ?? 0,
        baseDistanceKm: v.baseDistanceKm,
        extraKmRate: v.extraKmRate,
        description: v.description,
        category: v.category,
        seating: v.seating,
        luggage: v.luggage,
        sortOrder: v.sortOrder,
      };
    })
    .filter((t) => t.imageUrl && (t.hourlyRate > 0 || t.pricePerKm > 0));
  return sortTiersForSelect(mapped);
}

export function findTierById(tiers: VehicleTierOption[], id: string): VehicleTierOption | undefined {
  return tiers.find((t) => t.id === id);
}

/** Parcel Delivery: Premier Black Car (sedan or SUV) — stable tierId black-sedan. */
export function isParcelBlackCarTier(tier: {
  id: string;
  title: string;
  subtitle: string;
}): boolean {
  const title = tier.title.trim().toLowerCase().replace(/\s+/g, " ");
  if (tier.id === "black-sedan") return true;
  if (title === "premier black" || title === "premier black car") return true;
  return title === "black car";
}

export function filterVehicleTiersForParcel(
  tiers: VehicleTierOption[]
): VehicleTierOption[] {
  const matched = tiers.filter(isParcelBlackCarTier);
  if (matched.length > 0) return matched;
  return tiers.filter((t) => t.id === "black-sedan");
}

/** Uber-style capacity: person icon shows this number. */
export function getTierCapacity(tier: {
  id?: string;
  seating?: string;
  title?: string;
}): number {
  const fromSeating = (() => {
    const raw = String(tier.seating || "").trim();
    if (!raw) return null;
    const nums = raw.match(/\d+/g)?.map((n) => parseInt(n, 10)).filter((n) => n > 0);
    if (!nums?.length) return null;
    return Math.max(...nums);
  })();
  if (fromSeating) return fromSeating;

  // Legacy titles like "Premier Black · 3"
  const fromTitle = String(tier.title || "").match(/[·•]\s*(\d+)\s*$/);
  if (fromTitle) return parseInt(fromTitle[1], 10);

  switch (tier.id) {
    case "black-suv":
    case "cadillac-escalade":
    case "exec-black-suv":
    case "xlarge-suv":
      return 6;
    case "exec-sprinter-van-14":
      return 14;
    default:
      return 3;
  }
}

/** Display title without trailing " · 3" capacity suffix. */
export function formatTierDisplayTitle(title: string): string {
  return String(title || "")
    .replace(/\s*[·•]\s*\d+\s*$/, "")
    .trim();
}

/** Preferred Select Vehicle / home title for a tier. */
export function getTierDisplayTitle(id: string | undefined, title: string): string {
  if (id && TIER_DISPLAY_TITLES[id]) return TIER_DISPLAY_TITLES[id];
  return formatTierDisplayTitle(title);
}

/**
 * Same short line under the vehicle name in Select Vehicle (not the long admin description).
 * Prefers API subtitle, then curated local default, then description as last resort.
 */
export function getTierSubtitle(
  id: string | undefined,
  subtitle?: string | null,
  description?: string | null
): string {
  const fromApi = String(subtitle || "").trim();
  if (fromApi) return fromApi;
  if (id) {
    const def = VEHICLE_TIER_DEFINITIONS.find((d) => d.id === id);
    const fromDef = String(def?.subtitle || "").trim();
    if (fromDef) return fromDef;
  }
  return String(description || "").trim();
}
