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
    title: "Black SEDAN ",
    subtitle: "LUXURY SEDAN CAR",
    group: "standard",
    representativeFleetId: "cadillac-xts",
  },
  {
    id: "black-sedan",
    title: "BLACK CAR",
    subtitle: "Luxury Sedan/SUV",
    group: "standard",
    representativeFleetId: "cadillac-xts",
  },
  {
    id: "black-suv",
    title: "BLACK SUV",
    subtitle: "Large SUV",
    group: "standard",
    representativeFleetId: "chevrolet-suburban",
  },
  {
    id: "cadillac-escalade",
    title: "Cadillac Escalade",
    subtitle: "CADILLAC ESCALADE",
    group: "standard",
    representativeFleetId: "cadillac-escalade",
  },
  {
    id: "exec-black-sedan",
    title: "Executive BLACK SEDAN ",
    subtitle: "Executive Luxury Sedan ",
    group: "executive",
    representativeFleetId: "mercedes-s-class",
  },
  {
    id: "exec-black-suv",
    title: "Executive Large SUV ",
    subtitle: "ONLY SUV CAN BE RESERVED",
    group: "executive",
    representativeFleetId: "chevrolet-suburban",
    pricePerKm: 5.5,
    hourlyRate: 295,
  },
  {
    id: "exec-cadillac-escalade",
    title: "Executive Cadillac Escalade ",
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
