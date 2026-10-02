import { env } from "../config/env";
import { logger } from "../utils/logger";

export interface EtaResult {
  distanceKm: number;
  etaMinutes: number;
  source: "estimate" | "osrm";
}

export class EtaService {
  /**
   * Calculates estimated travel time in minutes.
   * Formula: (distanceKm / speedKmph) * 60
   * Configurable emergency speed via DEFAULT_EMERGENCY_SPEED_KMPH (default 40 km/h).
   */
  static calculateEta(
    distanceKm: number,
    speedKmph: number = env.DEFAULT_EMERGENCY_SPEED_KMPH
  ): EtaResult {
    const validSpeed = speedKmph > 0 ? speedKmph : 40;
    const etaMinutes = Number(((distanceKm / validSpeed) * 60).toFixed(1));

    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      etaMinutes,
      source: "estimate",
    };
  }

  /**
   * Optional real routing integration (e.g. OSRM) that falls back to deterministic ETA.
   */
  static async calculateRoutingEta(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    fallbackDistanceKm: number
  ): Promise<EtaResult> {
    if (!env.OSRM_BASE_URL) {
      return this.calculateEta(fallbackDistanceKm);
    }

    try {
      const url = `${env.OSRM_BASE_URL}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`;
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          return {
            distanceKm: Number((route.distance / 1000).toFixed(2)),
            etaMinutes: Number((route.duration / 60).toFixed(1)),
            source: "osrm",
          };
        }
      }
    } catch (err) {
      logger.debug("OSRM routing request failed or timed out, using deterministic ETA estimate");
    }

    return this.calculateEta(fallbackDistanceKm);
  }
}
