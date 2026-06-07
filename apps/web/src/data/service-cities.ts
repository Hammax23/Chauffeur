export type ServiceCity = {
  id: string;
  name: string;
  province: "ON" | "QC" | "ON/NY";
  lng: number;
  lat: number;
  slug?: string;
  hub?: boolean;
};

/** SARJ service cities — Ontario, Quebec & Golden Horseshoe */
export const SERVICE_CITIES: ServiceCity[] = [
  { id: "windsor", name: "Windsor", province: "ON", lng: -83.0, lat: 42.31 },
  { id: "london", name: "London", province: "ON", lng: -81.15, lat: 43.04, slug: "london" },
  { id: "kitchener", name: "Kitchener", province: "ON", lng: -80.49, lat: 43.45 },
  { id: "hamilton", name: "Hamilton", province: "ON", lng: -79.94, lat: 43.17, slug: "hamilton" },
  { id: "niagara", name: "Niagara / Buffalo", province: "ON/NY", lng: -79.08, lat: 43.09, slug: "niagara-buffalo" },
  { id: "oakville", name: "Oakville", province: "ON", lng: -79.67, lat: 43.45, hub: true },
  { id: "mississauga", name: "Mississauga", province: "ON", lng: -79.64, lat: 43.59 },
  { id: "toronto", name: "Toronto Pearson", province: "ON", lng: -79.62, lat: 43.68, slug: "toronto-pearson", hub: true },
  { id: "markham", name: "Markham", province: "ON", lng: -79.26, lat: 43.87 },
  { id: "barrie", name: "Barrie", province: "ON", lng: -79.69, lat: 44.39 },
  { id: "kingston", name: "Kingston", province: "ON", lng: -76.48, lat: 44.23 },
  { id: "ottawa", name: "Ottawa", province: "ON", lng: -75.67, lat: 45.32, slug: "ottawa", hub: true },
  { id: "montreal", name: "Montreal", province: "QC", lng: -73.74, lat: 45.47, slug: "montreal", hub: true },
  { id: "laval", name: "Laval", province: "QC", lng: -73.75, lat: 45.57 },
  { id: "quebec-city", name: "Quebec City", province: "QC", lng: -71.21, lat: 46.81 },
  { id: "burlington", name: "Burlington", province: "ON", lng: -79.8, lat: 43.33 },
];
