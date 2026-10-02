import { Coordinates, calculateDistanceKm, calculateEtaMinutes, isValidCoordinate } from "../utils/distance";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export interface RouteEstimate {
  distanceKm: number;
  etaMinutes: number;
  source: "osrm" | "haversine";
}

export class LocationService {
  static validate(coords: Coordinates): boolean {
    return isValidCoordinate(coords.lat, coords.lng);
  }

  static getDistanceKm(a: Coordinates, b: Coordinates): number {
    return Number(calculateDistanceKm(a, b).toFixed(2));
  }

  static getEtaMinutes(distanceKm: number): number {
    return calculateEtaMinutes(distanceKm);
  }

  /**
   * Calculates realistic route distance and ETA.
   * Attempts OSRM public routing if available; gracefully falls back to deterministic formula.
   */
  static async getRouteEstimate(from: Coordinates, to: Coordinates): Promise<RouteEstimate> {
    const fallbackDist = this.getDistanceKm(from, to);
    const fallbackEta = this.getEtaMinutes(fallbackDist);

    if (!env.OSRM_BASE_URL) {
      return { distanceKm: fallbackDist, etaMinutes: fallbackEta, source: "haversine" };
    }

    try {
      const url = `${env.OSRM_BASE_URL}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);

      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (resp.ok) {
        const data = (await resp.json()) as any;
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distKm = Number((route.distance / 1000).toFixed(2));
          const etaMin = Number((route.duration / 60).toFixed(1));
          return {
            distanceKm: distKm,
            etaMinutes: Math.max(1, etaMin),
            source: "osrm",
          };
        }
      }
    } catch (err) {
      logger.debug("OSRM route fetch failed or timed out, using deterministic fallback", err);
    }

    return { distanceKm: fallbackDist, etaMinutes: fallbackEta, source: "haversine" };
  }
}
