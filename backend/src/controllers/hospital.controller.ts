import { Request, Response, NextFunction } from "express";
import { HospitalService } from "../services/hospital.service";
import { prisma } from "../config/database";
import { ReservationService } from "../services/reservation.service";
import { z } from "zod";

export const patchAvailabilitySchema = z.object({
  icu: z.number().int().min(0).optional(),
  ventilator: z.number().int().min(0).optional(),
  cardiac: z.number().int().min(0).max(1).optional(),
  oxygen: z.number().int().min(0).optional(),
  burns: z.number().int().min(0).max(1).optional(),
});

function requireHospitalId(req: Request, res: Response): string | null {
  const hId = req.user?.hospitalId;
  if (!hId) {
    res.status(403).json({
      message: "Your account is not linked to any hospital.",
      error: { code: "NO_HOSPITAL_ASSIGNED", message: "hospitalId missing from token" },
    });
    return null;
  }
  return hId;
}

export class HospitalController {
  // ── /me convenience endpoints ──

  static async getMyHospital(req: Request, res: Response, next: NextFunction) {
    try {
      const hId = requireHospitalId(req, res);
      if (!hId) return;
      const hospital = await HospitalService.getHospitalById(hId);
      return res.status(200).json(hospital);
    } catch (err) {
      next(err);
    }
  }

  static async patchMyAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const hId = requireHospitalId(req, res);
      if (!hId) return;
      const actor = req.user?.username || "hospital-staff";
      const result = await HospitalService.updateAvailability(hId, req.body, actor);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getMyEmergencies(req: Request, res: Response, next: NextFunction) {
    try {
      const hId = requireHospitalId(req, res);
      if (!hId) return;
      // Return emergencies that have been broadcast to this hospital (have a response or reservation)
      const responses = await prisma.hospitalResponse.findMany({
        where: { hospitalId: hId },
        include: { emergency: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      const reservations = await prisma.reservation.findMany({
        where: { hospitalId: hId },
        include: { emergency: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      // Deduplicate emergencies
      const emergencyMap = new Map<string, any>();
      for (const r of responses) {
        if (r.emergency && !emergencyMap.has(r.emergency.id)) {
          emergencyMap.set(r.emergency.id, {
            ...r.emergency,
            hospitalResponse: { icu: r.icu, ventilator: r.ventilator, oxygen: r.oxygen, cardiac: r.cardiac, burns: r.burns, fulfillmentPercentage: r.fulfillmentPercentage },
          });
        }
      }
      for (const r of reservations) {
        if (r.emergency && !emergencyMap.has(r.emergency.id)) {
          emergencyMap.set(r.emergency.id, r.emergency);
        }
      }
      return res.status(200).json(Array.from(emergencyMap.values()));
    } catch (err) {
      next(err);
    }
  }

  static async getMyEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const hId = requireHospitalId(req, res);
      if (!hId) return;
      const events = await prisma.eventLog.findMany({
        where: { hospitalId: hId },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return res.status(200).json(events);
    } catch (err) {
      next(err);
    }
  }

  static async getMyReservations(req: Request, res: Response, next: NextFunction) {
    try {
      const hId = requireHospitalId(req, res);
      if (!hId) return;
      const statusParam = req.query.status as string;

      const whereClause: any = { hospitalId: hId };
      if (statusParam === "pending") {
        whereClause.status = "RESERVATION_REQUESTED";
      } else if (statusParam === "held") {
        whereClause.status = "HELD";
        whereClause.arrivedAt = null;
      }

      const reservations = await prisma.reservation.findMany({
        where: whereClause,
        include: { emergency: true },
        orderBy: { createdAt: "desc" },
      });

      return res.status(200).json(reservations.map((r) => ReservationService.formatReservation(r)));
    } catch (err) {
      next(err);
    }
  }

  // ── Standard param-based endpoints ──

  static async getNearbyHospitals(req: Request, res: Response, next: NextFunction) {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm as string) : undefined;
      const severity = req.query.severity as any;
      const resourcesParam = req.query.resources || req.query.requiredResources;
      const requiredResources = typeof resourcesParam === "string"
        ? (resourcesParam.split(",").map((s) => s.trim().toLowerCase()) as any[])
        : Array.isArray(resourcesParam)
        ? (resourcesParam as any[])
        : [];

      const result = await HospitalService.getNearbyHospitals({
        lat,
        lng,
        radiusKm,
        requiredResources,
        severity,
      });

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getHospitals(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitals = await HospitalService.listHospitals();
      return res.status(200).json(hospitals);
    } catch (err) {
      next(err);
    }
  }

  static async getHospitalById(req: Request, res: Response, next: NextFunction) {
    try {
      const { hospitalId } = req.params;
      const hospital = await HospitalService.getHospitalById(hospitalId);
      return res.status(200).json(hospital);
    } catch (err) {
      next(err);
    }
  }

  static async getAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { hospitalId } = req.params;
      const availability = await HospitalService.getAvailability(hospitalId);
      return res.status(200).json(availability);
    } catch (err) {
      next(err);
    }
  }

  static async patchAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { hospitalId } = req.params;
      const actor = req.user?.username || "hospital-staff";

      // Role check: Hospital staff can only update their own hospital unless admin
      const userRole = req.user ? (req.user.role || "").toUpperCase() : "";
      const isHospitalStaff = userRole === "HOSPITAL" || userRole === "HOSPITAL_NURSE";
      if (req.user && isHospitalStaff && req.user.hospitalId && req.user.hospitalId !== hospitalId) {
        return res.status(403).json({
          message: "Staff members may only update availability for their assigned hospital",
          error: {
            code: "FORBIDDEN",
            message: "Staff members may only update availability for their assigned hospital",
          },
        });
      }

      const result = await HospitalService.updateAvailability(hospitalId, req.body, actor);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getReservations(req: Request, res: Response, next: NextFunction) {
    try {
      const { hospitalId } = req.params;
      const statusParam = req.query.status as string;

      const whereClause: any = { hospitalId };
      if (statusParam === "pending") {
        whereClause.status = "RESERVATION_REQUESTED";
      } else if (statusParam === "held") {
        whereClause.status = "HELD";
        whereClause.arrivedAt = null;
      }

      const reservations = await prisma.reservation.findMany({
        where: whereClause,
        include: { emergency: true },
        orderBy: { createdAt: "desc" },
      });

      return res.status(200).json(reservations.map((r) => ReservationService.formatReservation(r)));
    } catch (err) {
      next(err);
    }
  }
}

