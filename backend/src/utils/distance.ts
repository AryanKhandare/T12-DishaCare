export interface Coordinates {
  lat: number;
  lng: number;
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Calculates great-circle distance between two geographic coordinates using the Haversine formula.
 * R = 6371 km
 * Supports either calculateDistanceKm(lat1, lon1, lat2, lon2) or calculateDistanceKm(a, b).
 */
export function calculateDistanceKm(
  lat1OrA: number | Coordinates,
  lon1OrB: number | Coordinates,
  lat2?: number,
  lon2?: number
): number {
  let lat1: number, lon1: number, lat2Val: number, lon2Val: number;

  if (typeof lat1OrA === "object" && typeof lon1OrB === "object") {
    lat1 = lat1OrA.lat;
    lon1 = lat1OrA.lng;
    lat2Val = lon1OrB.lat;
    lon2Val = lon1OrB.lng;
  } else {
    lat1 = lat1OrA as number;
    lon1 = lon1OrB as number;
    lat2Val = lat2 ?? 0;
    lon2Val = lon2 ?? 0;
  }

  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2Val, lon2Val)) {
    throw new Error("Invalid latitude or longitude provided to calculateDistanceKm");
  }

  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2Val - lat1) * Math.PI) / 180;
  const dLon = ((lon2Val - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2Val * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Number(distance.toFixed(2));
}

/**
 * Calculate deterministic estimated travel time (in minutes) for emergency ambulance.
 * Uses 1.3 road winding factor over straight-line distance at avg speed 40 km/h + 1 min dispatch overhead.
 */
export function calculateEtaMinutes(distanceKm: number): number {
  const avgSpeedKmh = 40;
  const roadFactor = 1.3;
  const dispatchOverheadMin = 1.0;
  return Number((dispatchOverheadMin + ((distanceKm * roadFactor) / avgSpeedKmh) * 60).toFixed(1));
}
