export type FleetCategory = "Sedan" | "SUV" | "Van" | "Executive" | "Coach";

export interface FleetVehicle {
  id: string;
  name: string;
  description: string;
  image: string;
  category: FleetCategory;
  seating: string;
  luggage: string;
  price: number;
}

export const fleetData: FleetVehicle[] = [
  {
    id: "cadillac-xts",
    name: "Cadillac XTS",
    description: "American luxury redefined. Spacious cabin, smooth ride, and premium comfort for every journey.",
    image: "/fleet/xts1.png",
    category: "Sedan",
    seating: "4 maximum, 3 comfortable",
    luggage: "2 large, 2 medium",
    price: 115,
  },
  {
    id: "chevrolet-suburban",
    name: "Chevrolet Suburban",
    description: "Spacious SUV for larger groups. Comfort, capacity, and capability in one package.",
    image: "/fleet/suburban.png",
    category: "SUV",
    seating: "6 maximum, 5 comfortable",
    luggage: "5 large, 2 medium, 4 small",
    price: 145,
  },
  {
    id: "cadillac-escalade",
    name: "Cadillac Escalade",
    description: "Full-size luxury SUV. Spacious, powerful, and perfect for groups or extra luggage.",
    image: "/fleet/escalade.png",
    category: "SUV",
    seating: "6 maximum, 5 comfortable",
    luggage: "5 large, 2 medium, 4 small",
    price: 175,
  },
  {
    id: "cadillac-lyric",
    name: "Cadillac Lyric",
    description: "Elegant luxury sedan. Refined styling, smooth performance, and exceptional passenger comfort.",
    image: "/fleet/lyric.png",
    category: "Sedan",
    seating: "4 maximum, 3 comfortable",
    luggage: "2 large, 2 medium",
    price: 135,
  },
  {
    id: "mercedes-s-class",
    name: "Mercedes S Class",
    description: "Flagship luxury sedan. Premium comfort, cutting-edge tech, and refined elegance.",
    image: "/fleet/mercedesS1.png",
    category: "Executive",
    seating: "3 maximum, 3 comfortable",
    luggage: "3 pieces",
    price: 295,
  },
  {
    id: "sprinter-van",
    name: "Sprinter Van",
    description: "Luxury van with premium amenities. Ideal for airport transfers and group travel.",
    image: "/fleet/sprinter.png",
    category: "Van",
    seating: "16 maximum, 16 comfortable",
    luggage: "16 large",
    price: 285,
  },
];

export const fleetCategories: FleetCategory[] = ["Sedan", "Executive", "SUV", "Van", "Coach"];
