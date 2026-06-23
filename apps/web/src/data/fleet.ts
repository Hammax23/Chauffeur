export type FleetCategory = "Sedan" | "SUV" | "Van" | "Executive" | "Coach";

export interface FleetVehicle {
  id: string;
  name: string;
  dropdownName: string;
  description: string;
  image: string;
  category: FleetCategory;
  seating: string;
  luggage: string;
  /** Hourly rate (used for reservation pricing). */
  price: number;
  /** Public per-kilometre rate shown in mobile fleet preview cards. */
  pricePerKm: number;
}

export const fleetData: FleetVehicle[] = [
  {
    id: "cadillac-xts",
    name: "Cadillac XTS",
    dropdownName: "LUXURY SEDAN",
    description: "Luxury Sedan, Spacious and comfortable, prioritizing a quiet, smooth ride",
    image: "/fleet/xts1.png",
    category: "Sedan",
    seating: "3 maximum, 3 comfortable",
    luggage: "2 large, 2 medium",
    price: 120,
    pricePerKm: 3.10,
  },
  {
    id: "cadillac-lyric",
    name: "Cadillac Lyric",
    dropdownName: "EXECUTIVE VAN",
    description: "Elegant luxury sedan. Refined styling, smooth performance, and exceptional passenger comfort.",
    image: "/fleet/lyricfront.png",
    category: "Sedan",
    seating: "3 maximum, 3 comfortable",
    luggage: "2 large, 2 medium",
    price: 140,
    pricePerKm: 3.10,
  },
  {
    id: "lexus-es",
    name: "Lexus ES",
    dropdownName: "LEXUS ES",
    description: "Premium luxury sedan with smooth performance, refined cabin, and executive-level comfort.",
    image: "https://images.unsplash.com/photo-1621007947382-b0046d7c7f33?w=800&auto=format&fit=crop",
    category: "Sedan",
    seating: "3 maximum, 3 comfortable",
    luggage: "2 large, 2 medium",
    price: 100,
    pricePerKm: 3.05,
  },
  {
    id: "volvo-s90",
    name: "Volvo S90",
    dropdownName: "VOLVO S90",
    description: "Scandinavian luxury sedan with sophisticated design, serene ride quality, and premium appointments.",
    image: "https://images.unsplash.com/photo-1614162692292-7cdb56f0cedf?w=800&auto=format&fit=crop",
    category: "Sedan",
    seating: "3 maximum, 3 comfortable",
    luggage: "2 large, 2 medium",
    price: 100,
    pricePerKm: 3.05,
  },
  {
    id: "chevrolet-suburban",
    name: "Chevrolet Suburban",
    dropdownName: "SUV",
    description: "Spacious SUV for larger groups. Comfort, capacity, and capability in one package.",
    image: "/fleet/suburban.png",
    category: "SUV",
    seating: "6 maximum, 5 comfortable",
    luggage: "5 large, 2 medium, 4 small",
    price: 150,
    pricePerKm: 3.52,
  },
  {
    id: "cadillac-escalade",
    name: "Cadillac Escalade",
    dropdownName: "ESCALADE",
    description: "Full-size luxury SUV. Spacious, powerful, and perfect for groups or extra luggage.",
    image: "/fleet/escalade.png",
    category: "SUV",
    seating: "6 maximum, 5 comfortable",
    luggage: "5 large, 2 medium, 4 small",
    price: 180,
    pricePerKm: 4.04,
  },
  {
    id: "lincoln-navigator",
    name: "Lincoln Navigator",
    dropdownName: "NAVIGATOR",
    description: "Refined full-size luxury SUV with commanding presence, premium comfort, and generous space for groups.",
    image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&auto=format&fit=crop",
    category: "SUV",
    seating: "6 maximum, 5 comfortable",
    luggage: "4 large, 2 medium",
    price: 170,
    pricePerKm: 3.85,
  },
  {
    id: "gmc-yukon-xl",
    name: "GMC Yukon XL",
    dropdownName: "YUKON XL",
    description: "Extended luxury SUV with extra cargo room and seating comfort for families and executive group travel.",
    image: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&auto=format&fit=crop",
    category: "SUV",
    seating: "6 maximum, 5 comfortable",
    luggage: "4 large, 2 medium",
    price: 160,
    pricePerKm: 3.65,
  },
  {
    id: "mercedes-s-class",
    name: "Mercedes S Class",
    dropdownName: "MERCEDES BENZ",
    description: "Flagship luxury sedan. Premium comfort, cutting-edge tech, and refined elegance.",
    image: "/fleet/mercedesS1.png",
    category: "Executive",
    seating: "3 maximum, 3 comfortable",
    luggage: "3 pieces",
    price: 300,
    pricePerKm: 5.55,
  },
  {
    id: "sprinter-van",
    name: "Sprinter Van",
    dropdownName: "SPRINTER",
    description: "Luxury van with premium amenities. Ideal for airport transfers and group travel.",
    image: "/fleet/sprinter.png",
    category: "Van",
    seating: "16 maximum, 16 comfortable",
    luggage: "16 large",
    price: 290,
    pricePerKm: 5.55,
  },
];

export function getVehicleMaxSeats(seating: string): number {
  const match = seating.match(/(\d+)\s+maximum/i);
  if (match) return parseInt(match[1], 10);
  const fallback = parseInt(seating, 10);
  return Number.isNaN(fallback) ? 0 : fallback;
}

/** Vehicles available for online reservation (same list as homepage / fleet page). */
export function getFleetForReservation(
  passengerCount: number,
  source: FleetVehicle[] = fleetData
): FleetVehicle[] {
  const count = Math.max(1, passengerCount);
  return source.filter((vehicle) => getVehicleMaxSeats(vehicle.seating) >= count);
}

export const fleetCategories: FleetCategory[] = ["Sedan", "SUV", "Executive", "Van", "Coach"];

/** No hourly rate on Online Reservation vehicle cards or confirmation for these vehicles. */
export const RESERVATION_HIDE_HOURLY_RATE_IDS = new Set([
  "cadillac-escalade",
  "sprinter-van",
]);
