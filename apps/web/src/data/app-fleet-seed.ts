/**
 * Default app fleet tiers (seeded into AppFleetVehicle).
 * Images are resolved from website FleetVehicle / static fleet when seeding.
 */
export type AppFleetSeedItem = {
  tierId: string;
  title: string;
  subtitle: string;
  description: string;
  group: "standard" | "executive";
  category: string;
  seating: string;
  luggage: string;
  pricePerKm: number;
  hourlyRate: number;
  showOnHome: boolean;
  sortOrder: number;
  /** Used only at seed time to copy image from website fleet */
  imageFromVehicleId: string;
};

export const APP_FLEET_SEED: AppFleetSeedItem[] = [
  {
    tierId: "only-black-sedan",
    title: "Black SEDAN",
    subtitle: "LUXURY SEDAN CAR",
    description: "Premium black luxury sedan for airport and city transfers.",
    group: "standard",
    category: "Sedan",
    seating: "3 maximum, 3 comfortable",
    luggage: "2 large, 2 medium",
    pricePerKm: 0,
    hourlyRate: 0,
    showOnHome: true,
    sortOrder: 1,
    imageFromVehicleId: "cadillac-xts",
  },
  {
    tierId: "black-sedan",
    title: "BLACK CAR",
    subtitle: "Luxury Sedan/SUV",
    description: "Black car service — luxury sedan or SUV class.",
    group: "standard",
    category: "Sedan",
    seating: "3 maximum, 3 comfortable",
    luggage: "2 large, 2 medium",
    pricePerKm: 0,
    hourlyRate: 0,
    showOnHome: true,
    sortOrder: 2,
    imageFromVehicleId: "cadillac-xts",
  },
  {
    tierId: "black-suv",
    title: "BLACK SUV",
    subtitle: "Large SUV",
    description: "Spacious black SUV for groups and luggage.",
    group: "standard",
    category: "SUV",
    seating: "6 maximum, 5 comfortable",
    luggage: "4 large, 4 medium",
    pricePerKm: 0,
    hourlyRate: 0,
    showOnHome: true,
    sortOrder: 3,
    imageFromVehicleId: "chevrolet-suburban",
  },
  {
    tierId: "cadillac-escalade",
    title: "Cadillac Escalade",
    subtitle: "CADILLAC ESCALADE",
    description: "Cadillac Escalade for premium group travel.",
    group: "standard",
    category: "SUV",
    seating: "6 maximum, 5 comfortable",
    luggage: "4 large, 4 medium",
    pricePerKm: 0,
    hourlyRate: 0,
    showOnHome: true,
    sortOrder: 4,
    imageFromVehicleId: "cadillac-escalade",
  },
  {
    tierId: "exec-black-sedan",
    title: "Executive BLACK SEDAN",
    subtitle: "Executive Luxury Sedan",
    description: "Executive black sedan for VIP and corporate travel.",
    group: "executive",
    category: "Executive",
    seating: "3 maximum, 3 comfortable",
    luggage: "2 large, 2 medium",
    pricePerKm: 0,
    hourlyRate: 0,
    showOnHome: true,
    sortOrder: 5,
    imageFromVehicleId: "mercedes-s-class",
  },
  {
    tierId: "exec-black-suv",
    title: "Executive Large SUV",
    subtitle: "ONLY SUV CAN BE RESERVED",
    description: "Executive large SUV with premium rates.",
    group: "executive",
    category: "Executive",
    seating: "6 maximum, 5 comfortable",
    luggage: "4 large, 4 medium",
    pricePerKm: 5.5,
    hourlyRate: 295,
    showOnHome: true,
    sortOrder: 6,
    imageFromVehicleId: "chevrolet-suburban",
  },
  {
    tierId: "exec-cadillac-escalade",
    title: "Executive Cadillac Escalade",
    subtitle: "ONLY CADILLAC ESCALADE CAN BE RESERVED",
    description: "Executive Cadillac Escalade with premium rates.",
    group: "executive",
    category: "Executive",
    seating: "6 maximum, 5 comfortable",
    luggage: "4 large, 4 medium",
    pricePerKm: 5.5,
    hourlyRate: 295,
    showOnHome: true,
    sortOrder: 7,
    imageFromVehicleId: "cadillac-escalade",
  },
];
