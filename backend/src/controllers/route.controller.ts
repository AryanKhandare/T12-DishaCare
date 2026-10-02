import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { calculateDistanceKm, calculateEtaMinutes, isValidCoordinate } from "../utils/distance";

// In-memory LRU cache for recently calculated routes (key: "fromLat,fromLng-toLat,toLng")
const routeCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute cache for identical coordinates

export class RouteController {
  static async getRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const fromLat = parseFloat(req.query.fromLat as string);
      const fromLng = parseFloat(req.query.fromLng as string);
      const toLat = parseFloat(req.query.toLat as string);
      const toLng = parseFloat(req.query.toLng as string);

      if (
        !isValidCoordinate(fromLat, fromLng) ||
        !isValidCoordinate(toLat, toLng)
      ) {
        return res.status(400).json({
          error: "INVALID_COORDINATES",
          message: "Valid fromLat, fromLng, toLat, and toLng query parameters are required.",
        });
      }

      // Rounded cache key (~10m precision)
      const cacheKey = `${fromLat.toFixed(4)},${fromLng.toFixed(4)}-${toLat.toFixed(4)},${toLng.toFixed(4)}`;
      const cached = routeCache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return res.status(200).json(cached.data);
      }

      const straightLineDist = Number(calculateDistanceKm({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng }).toFixed(2));
      const fallbackEta = calculateEtaMinutes(straightLineDist);

      // Attempt OSRM driving route with full geometry
      const osrmBase = env.OSRM_BASE_URL || "https://router.project-osrm.org";
      const osrmUrl = `${osrmBase}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);

        const resp = await fetch(osrmUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (resp.ok) {
          const body = (await resp.json()) as any;
          if (body.code === "Ok" && body.routes && body.routes.length > 0) {
            const r = body.routes[0];
            const distMeters = Math.round(r.distance);
            const distKm = Number((r.distance / 1000).toFixed(2));
            const durationSec = Math.round(r.duration);
            const etaMin = Math.max(1, Math.round(r.duration / 60));

            // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
            const leafletCoords: [number, number][] = (r.geometry?.coordinates || []).map(
              (pt: [number, number]) => [pt[1], pt[0]]
            );

            const result = {
              distanceMeters: distMeters,
              distanceKm: distKm,
              durationSeconds: durationSec,
              etaMinutes: etaMin,
              geometry: leafletCoords.length > 0 ? leafletCoords : [[fromLat, fromLng], [toLat, toLng]],
              source: "osrm" as const,
              status: "LIVE_ROUTE",
              summary: r.legs?.[0]?.summary || "Driving route via OSRM",
            };

            routeCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });
            return res.status(200).json(result);
          }
        }
      } catch (osrmErr) {
        logger.debug("OSRM fetch timed out or unreachable, using deterministic fallback", osrmErr);
      }

      // Graceful deterministic fallback
      const fallbackResult = {
        distanceMeters: Math.round(straightLineDist * 1000),
        distanceKm: straightLineDist,
        durationSeconds: Math.round(fallbackEta * 60),
        etaMinutes: fallbackEta,
        geometry: [
          [fromLat, fromLng],
          [toLat, toLng],
        ],
        source: "fallback" as const,
        status: "FALLBACK_ROUTE",
        summary: "Direct estimated route (fallback)",
      };

      return res.status(200).json(fallbackResult);
    } catch (err) {
      next(err);
    }
  }
}
