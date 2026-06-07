import provincePaths from "@/data/canada-province-paths.json";
import lakePaths from "@/data/canada-lake-paths.json";

/** Eastern Canada regional map — Ontario & Quebec service area */
export const CANADA_MAP = {
  width: 1000,
  height: 680,
  westLng: -84.5,
  eastLng: -69.5,
  southLat: 41.4,
  northLat: 48.8,
} as const;

/** Cropped viewBox — trims empty water so the map fills its container width */
export const MAP_VIEWBOX = {
  x: 15,
  y: 140,
  width: 975,
  height: 475,
} as const;

export function projectCanada(lng: number, lat: number): { x: number; y: number } {
  const { width, height, westLng, eastLng, southLat, northLat } = CANADA_MAP;
  return {
    x: ((lng - westLng) / (eastLng - westLng)) * width,
    y: ((northLat - lat) / (northLat - southLat)) * height,
  };
}

export function isInCanadaBounds(lng: number, lat: number): boolean {
  const { westLng, eastLng, southLat, northLat } = CANADA_MAP;
  return lng >= westLng && lng <= eastLng && lat >= southLat && lat <= northLat;
}

/** Natural Earth 50m province boundaries (projected SVG paths) */
export const ONTARIO_PATHS: string[] = provincePaths.Ontario;
export const QUEBEC_PATHS: string[] = provincePaths["Québec"];

/** Great Lakes — Natural Earth 50m */
export const LAKE_ERIE = lakePaths.Lake_Erie[0];
export const LAKE_ONTARIO = lakePaths.Lake_Ontario[0];
export const LAKE_HURON = lakePaths.Lake_Huron[0];
