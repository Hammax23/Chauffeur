import type { FleetVehicleDto } from "../services/api";

/** Dispatch tier shown in reservation (matches client vehicle categories). */
export interface VehicleTierDefinition {
  id: string;
  title: string;
  /** Reservation rule shown under the title (Uber-style subtitle). */
  subtitle: string;
  group: "standard" | "executive";
  /** Fleet vehicle used for thumbnail image. */
  representativeFleetId: string;
  /** Override per-km rate when it differs from the representative vehicle. */
  pricePerKm?: number;
  /** Override hourly rate when it differs from the representative vehicle. */
  hourlyRate?: number;
}

export const VEHICLE_TIER_DEFINITIONS: VehicleTierDefinition[] = [
  {
    id: "only-black-sedan",
    title: "Only Black SEDAN",
    subtitle: "ONLY SEDAN HAS TO GO",
    group: "standard",
    representativeFleetId: "cadillac-xts",
  },
  {
    id: "black-sedan",
    title: "BLACK SEDAN",
    subtitle: "ANY SEDAN OR ANY SUV CAN BE RESERVED",
    group: "standard",
    representativeFleetId: "cadillac-xts",
  },
  {
    id: "black-suv",
    title: "BLACK SUV",
    subtitle: "ONLY SUV CAN BE RESERVED",
    group: "standard",
    representativeFleetId: "chevrolet-suburban",
  },
  {
    id: "cadillac-escalade",
    title: "Cadillac Escalade",
    subtitle: "ONLY CADILLAC ESCALADE CAN BE RESERVED",
    group: "standard",
    representativeFleetId: "cadillac-escalade",
  },
  {
    id: "exec-black-sedan",
    title: "Executive BLACK SEDAN 2024 and up",
    subtitle: "ANY SEDAN OR ANY SUV CAN BE RESERVED",
    group: "executive",
    representativeFleetId: "mercedes-s-class",
  },
  {
    id: "exec-black-suv",
    title: "Executive BLACK SUV vehicle 2024 and up",
    subtitle: "ONLY SUV CAN BE RESERVED",
    group: "executive",
    representativeFleetId: "chevrolet-suburban",
    pricePerKm: 5.5,
    hourlyRate: 295,
  },
  {
    id: "exec-cadillac-escalade",
    title: "Executive Cadillac Escalade 2024 and up",
    subtitle: "ONLY CADILLAC ESCALADE CAN BE RESERVED",
    group: "executive",
    representativeFleetId: "cadillac-escalade",
    pricePerKm: 5.5,
    hourlyRate: 295,
  },
];

export interface VehicleTierOption extends VehicleTierDefinition {
  imageUrl: string;
  pricePerKm: number;
  hourlyRate: number;
}

/** Map a home-screen fleet card id → reservation tier id. */
const FLEET_ID_TO_TIER: Record<string, string> = {
  "cadillac-xts": "black-sedan",
  "cadillac-lyric": "black-sedan",
  "chevrolet-suburban": "black-suv",
  "cadillac-escalade": "cadillac-escalade",
  "mercedes-s-class": "exec-black-sedan",
  "sprinter-van": "black-suv",
};

export function resolveTierIdFromFleetVehicleId(fleetVehicleId: string): string {
  return FLEET_ID_TO_TIER[fleetVehicleId] ?? fleetVehicleId;
}

export function buildVehicleTierOptions(fleet: FleetVehicleDto[]): VehicleTierOption[] {
  const byId = new Map(fleet.map((v) => [v.id, v]));

  return VEHICLE_TIER_DEFINITIONS.map((def) => {
    const rep =
      byId.get(def.representativeFleetId) ??
      fleet.find((v) => v.category === "Sedan") ??
      fleet[0];

    return {
      ...def,
      imageUrl: rep?.imageUrl ?? "",
      pricePerKm: def.pricePerKm ?? rep?.pricePerKm ?? 0,
      hourlyRate: def.hourlyRate ?? rep?.price ?? 0,
    };
  }).filter((t) => t.imageUrl && t.pricePerKm > 0);
}

export function findTierById(tiers: VehicleTierOption[], id: string): VehicleTierOption | undefined {
  return tiers.find((t) => t.id === id);
}
