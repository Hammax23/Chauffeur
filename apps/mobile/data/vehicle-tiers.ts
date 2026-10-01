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

/** Offline / empty-API fallback (kept in sync with admin seed defaults). */
export const VEHICLE_TIER_DEFINITIONS: VehicleTierDefinition[] = [
  {
    id: "only-black-sedan",
    title: "Premier Black Sedan",
    subtitle: "Sedan only — no SUV swap",
    group: "standard",
    representativeFleetId: "cadillac-xts",
  },
  {
    id: "black-sedan",
    title: "Premier Black",
    subtitle: "Sedan or SUV — whichever is available",
    group: "standard",
    representativeFleetId: "cadillac-xts",
  },
  {
    id: "black-suv",
    title: "Premier Black SUV",
    subtitle: "Luxury SUV for up to 6",
    group: "standard",
    representativeFleetId: "chevrolet-suburban",
  },
  {
    id: "cadillac-escalade",
    title: "Cadillac Escalade",
    subtitle: "Escalade guaranteed · top-rated chauffeurs",
    group: "standard",
    representativeFleetId: "cadillac-escalade",
  },
  {
    id: "mercedes-s-class",
    title: "Mercedes-Benz S-Class",
    subtitle: "S-Class guaranteed · top-rated chauffeurs",
    group: "executive",
    representativeFleetId: "mercedes-s-class",
  },
  {
    id: "exec-black-sedan",
    title: "Executive Sedan",
    subtitle: "High-rated chauffeurs · sedan class",
    group: "executive",
    representativeFleetId: "mercedes-s-class",
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
    id: "electric-black-3",
    title: "Electric",
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
}

/** Map a home-screen fleet card id → reservation tier id. */
const FLEET_ID_TO_TIER: Record<string, string> = {
  "cadillac-xts": "black-sedan",
  "cadillac-lyric": "electric-black-3",
  "chevrolet-suburban": "black-suv",
  "cadillac-escalade": "cadillac-escalade",
  "mercedes-s-class": "mercedes-s-class",
  "sprinter-van": "exec-sprinter-van-14",
};

export function resolveTierIdFromFleetVehicleId(fleetVehicleId: string): string {
  return FLEET_ID_TO_TIER[fleetVehicleId] ?? fleetVehicleId;
}

/** Preferred: map admin-managed app fleet rows into reservation tiers. */
export function buildVehicleTiersFromAppFleet(appFleet: AppFleetVehicleDto[]): VehicleTierOption[] {
  return appFleet
    .map((v) => ({
      id: v.tierId || v.id,
      title: v.title,
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
    }))
    .filter((t) => t.imageUrl && (t.hourlyRate > 0 || t.pricePerKm > 0));
}

export function findTierById(tiers: VehicleTierOption[], id: string): VehicleTierOption | undefined {
  return tiers.find((t) => t.id === id);
}

/** Parcel Delivery: Premier Black (sedan or SUV) — stable tierId black-sedan. */
export function isParcelBlackCarTier(tier: {
  id: string;
  title: string;
  subtitle: string;
}): boolean {
  const title = tier.title.trim().toLowerCase().replace(/\s+/g, " ");
  if (tier.id === "black-sedan") return true;
  if (title === "premier black") return true;
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
