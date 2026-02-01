export type FleetCategory = "Sedan" | "SUV" | "Van" | "Executive" | "Coach";

export interface FleetVehicle {
  id: string;
  name: string;
  description: string;
  image: string;
  category: FleetCategory;
  seating: string;
  luggage: string;
}

export const fleetData: FleetVehicle[] = [
  {
    id: "cadillac-xts",
    name: "Cadillac XTS",
    description: "American luxury redefined. Spacious cabin, smooth ride, and premium comfort for every journey.",
    image: "/fleet/xts.png",
    category: "Sedan",
    seating: "4 maximum, 3 comfortable",
    luggage: "2 large, 2 medium",
  },
  {
    id: "mercedes-s-class",
    name: "Mercedes S Class",
    description: "Flagship luxury sedan. Premium comfort, cutting-edge tech, and refined elegance.",
    image: "/fleet/mercedesS1.png",
    category: "Executive",
    seating: "3 maximum, 3 comfortable",
    luggage: "3 pieces",
  },
  {
    id: "chevrolet-suburban",
    name: "Chevrolet Suburban",
    description: "Spacious SUV for larger groups. Comfort, capacity, and capability in one package.",
    image: "/fleet/suburban.png",
    category: "SUV",
    seating: "6 maximum, 5 comfortable",
    luggage: "5 large, 2 medium, 4 small",
  },
  {
    id: "cadillac-escalade",
    name: "Cadillac Escalade",
    description: "Full-size luxury SUV. Spacious, powerful, and perfect for groups or extra luggage.",
    image: "/fleet/escalade.png",
    category: "SUV",
    seating: "6 maximum, 5 comfortable",
    luggage: "5 large, 2 medium, 4 small",
  },
  {
    id: "sprinter-van",
    name: "Sprinter Van",
    description: "Luxury van with premium amenities. Ideal for airport transfers and group travel.",
    image: "/fleet/sprinter.png",
    category: "Van",
    seating: "16 maximum, 16 comfortable",
    luggage: "16 large",
  },
  {
    id: "minicoach-31",
    name: "31 Pax MiniCoach",
    description: "Full-size coach for larger groups. Perfect for corporate events and airport shuttles.",
    image: "https://adventlimo.com/assets/31-pax.jpg",
    category: "Coach",
    seating: "31 maximum, 27 comfortable",
    luggage: "30 pieces with 28 passengers",
  },
];

export const fleetCategories: FleetCategory[] = ["Sedan", "Executive", "SUV", "Van", "Coach"];
