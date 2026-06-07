/** Equirectangular projection aligned to viewBox 0 0 1000 × 500 */
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 500;

/** Ontario · Quebec · Golden Horseshoe service area */
export const SERVICE_REGION_BOUNDS = {
  westLng: -82.2,
  eastLng: -72.2,
  southLat: 42.4,
  northLat: 46.6,
};

export function latLngToMapXY(lng: number, lat: number): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * MAP_WIDTH,
    y: ((90 - lat) / 180) * MAP_HEIGHT,
  };
}

export function latLngToMapPercent(lng: number, lat: number): { x: number; y: number } {
  const { x, y } = latLngToMapXY(lng, lat);
  return {
    x: (x / MAP_WIDTH) * 100,
    y: (y / MAP_HEIGHT) * 100,
  };
}

/** Cropped viewBox so nearby cities are visibly separated on screen */
export function getServiceRegionViewBox(padding = 0.14) {
  const topLeft = latLngToMapXY(SERVICE_REGION_BOUNDS.westLng, SERVICE_REGION_BOUNDS.northLat);
  const bottomRight = latLngToMapXY(SERVICE_REGION_BOUNDS.eastLng, SERVICE_REGION_BOUNDS.southLat);
  const rawW = bottomRight.x - topLeft.x;
  const rawH = bottomRight.y - topLeft.y;
  const padX = rawW * padding;
  const padY = rawH * padding;
  return {
    x: topLeft.x - padX,
    y: topLeft.y - padY,
    width: rawW + padX * 2,
    height: rawH + padY * 2,
  };
}

export function isDotInServiceRegion(x: number, y: number, viewBox: { x: number; y: number; width: number; height: number }) {
  return x >= viewBox.x && x <= viewBox.x + viewBox.width && y >= viewBox.y && y <= viewBox.y + viewBox.height;
}
