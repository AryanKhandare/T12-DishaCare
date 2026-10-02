import { Router, Request, Response, NextFunction } from "express";
import { safeGetIO } from "../sockets/socket";
import { logger } from "../utils/logger";
import { requireAuth } from "../middleware/auth";

const router = Router();

// In-memory latest ambulance locations
const ambulanceLocations = new Map<string, any>();

// POST /api/ambulances/me/location
// Supports Section 21: Backend Synchronization & Section 23: Real-Time Location
router.post("/me/location", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ambulanceId = req.user?.ambulanceId || req.body.ambulanceId || "A12";
    const { latitude, longitude, accuracy, heading, timestamp } = req.body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "INVALID_COORDINATES", message: "latitude and longitude numbers are required" });
    }

    const payload = {
      ambulanceId,
      latitude: Number(latitude.toFixed(5)),
      longitude: Number(longitude.toFixed(5)),
      accuracy: accuracy ? Math.round(accuracy) : 15,
      heading: heading !== undefined ? Number(heading) : null,
      timestamp: timestamp || new Date().toISOString(),
    };

    ambulanceLocations.set(ambulanceId, payload);

    // Broadcast location to WebSocket clients (e.g. Dispatcher / Admin command center)
    const io = safeGetIO();
    if (io) {
      io.to(`ambulance:${ambulanceId}`).emit("AMBULANCE_LOCATION_UPDATED", payload);
      io.to("admin").emit("AMBULANCE_LOCATION_UPDATED", payload);
      io.emit("AMBULANCE_LOCATION_UPDATED", payload);
    }

    logger.debug(`Ambulance ${ambulanceId} location updated: ${latitude}, ${longitude} (±${accuracy}m)`);

    return res.status(200).json({ ok: true, location: payload });
  } catch (err) {
    next(err);
  }
});

// GET /api/ambulances/me/location
router.get("/me/location", requireAuth, (req: Request, res: Response) => {
  const ambulanceId = req.user?.ambulanceId || (req.query.ambulanceId as string) || "A12";
  const loc = ambulanceLocations.get(ambulanceId);
  return res.status(200).json({ ambulanceId, location: loc || null });
});

export const ambulanceRoutes = router;
