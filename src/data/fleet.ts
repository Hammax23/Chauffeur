export type FleetCategory = "Sedan" | "SUV" | "Van" | "Executive";

export interface FleetVehicle {
  id: string;
  name: string;
  description: string;
  image: string;
  category: FleetCategory;
  passengers: number;
  luggage: number;
}

export const fleetData: FleetVehicle[] = [
  {
    id: "mercedes-s550",
    name: "Mercedes-Benz S550",
    description: "Flagship luxury sedan. Premium comfort, cutting-edge tech, and refined elegance for executive travel.",
    image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&auto=format&fit=crop",
    category: "Executive",
    passengers: 3,
    luggage: 2,
  },
  {
    id: "bmw-760",
    name: "BMW 760i",
    description: "Ultimate driving luxury. Spacious interior, powerful performance, and first-class amenities.",
    image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop",
    category: "Executive",
    passengers: 3,
    luggage: 2,
  },
  {
    id: "mercedes-eqs",
    name: "Mercedes-Benz EQS",
    description: "Electric luxury at its finest. Silent, sustainable, and effortlessly sophisticated.",
    image: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop",
    category: "Sedan",
    passengers: 4,
    luggage: 2,
  },
  {
    id: "cadillac-xts",
    name: "Cadillac XTS",
    description: "American luxury redefined. Spacious cabin, smooth ride, and premium comfort for every journey.",
    image: "https://images.unsplash.com/photo-1563720360172-67b8f3dce741?w=800&auto=format&fit=crop",
    category: "Sedan",
    passengers: 4,
    luggage: 3,
  },
  {
    id: "cadillac-lyriq",
    name: "Cadillac Lyriq",
    description: "Electric SUV luxury. Bold design, advanced technology, and zero-emission sophistication.",
    image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&auto=format&fit=crop",
    category: "SUV",
    passengers: 4,
    luggage: 2,
  },
  {
    id: "range-rover",
    name: "Range Rover",
    description: "Iconic British SUV. Commanding presence, all-terrain capability, and sumptuous interiors.",
    image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&auto=format&fit=crop",
    category: "SUV",
    passengers: 5,
    luggage: 4,
  },
  {
    id: "cadillac-escalade",
    name: "Cadillac Escalade",
    description: "Full-size luxury SUV. Spacious, powerful, and perfect for groups or extra luggage.",
    image: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&auto=format&fit=crop",
    category: "SUV",
    passengers: 6,
    luggage: 4,
  },
  {
    id: "mercedes-v-class",
    name: "Mercedes-Benz V-Class",
    description: "Premium people mover. Ideal for airport transfers, corporate groups, and family travel.",
    image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&auto=format&fit=crop",
    category: "Van",
    passengers: 7,
    luggage: 5,
  },
  {
    id: "suburban",
    name: "Chevrolet Suburban",
    description: "Spacious SUV for larger groups. Comfort, capacity, and capability in one package.",
    image: "https://images.unsplash.com/photo-1664574654529-b60630f33fdb?w=800&auto=format&fit=crop",
    category: "Van",
    passengers: 6,
    luggage: 4,
  },
];

export const fleetCategories: FleetCategory[] = ["Executive", "Sedan", "SUV", "Van"];
