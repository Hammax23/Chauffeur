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
  price: number;
}

export const fleetData: FleetVehicle[] = [
  {
    id: "cadillac-xts",
    name: "Cadillac XTS",
    dropdownName: "SEDAN",
    description: "Luxury Sedan, Spacious and comfortable, prioritizing a quiet, smooth ride",
    image: "/fleet/xts1.png",
    category: "Sedan",
    seating: "4 maximum, 3 comfortable",
    luggage: "2 large, 2 medium",
    price: 115,
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
    price: 145,
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
    price: 175,
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
    price: 295,
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
    price: 285,
  },
  {
    id: "cadillac-lyric",
    name: "Cadillac Lyric",
    dropdownName: "EXECUTIVE VAN",
    description: "Elegant luxury sedan. Refined styling, smooth performance, and exceptional passenger comfort.",
    image: "/fleet/lyricfront.png",
    category: "Sedan",
    seating: "4 maximum, 3 comfortable",
    luggage: "2 large, 2 medium",
    price: 135,
  },
];

export const fleetCategories: FleetCategory[] = ["Sedan", "Executive", "SUV", "Van", "Coach"];
