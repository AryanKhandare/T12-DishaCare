import { Request, Response, NextFunction } from "express";
import { EmergencyService } from "../services/emergency.service";
import { MatchingService } from "../services/matching.service";
import { z } from "zod";
import { ResourceKey } from "../types";

export const createEmergencySchema = z.object({
  type: z.enum(["Trauma", "Cardiac", "Respiratory", "Burns", "Other"]),
  severity: z.enum(["Critical", "Serious", "Stable"]),
  age: z.number().int().min(0).max(120).optional(),
  gender: z.string().optional(),
  resources: z.array(z.enum(["icu", "ventilator", "cardiac", "oxygen", "burns"])),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    label: z.string(),
  }),
});

export const recordResponseSchema = z.object({
  icu: z.boolean().optional(),
  ventilator: z.boolean().optional(),
  oxygen: z.boolean().optional(),
  cardiac: z.boolean().optional(),
  burns: z.boolean().optional(),
});

export class EmergencyController {
  static async createEmergency(req: Request, res: Response, next: NextFunction) {
    try {
      const ambulanceId = req.user?.ambulanceId || "A12";
      const actor = req.user?.username || "dispatcher";
      const result = await EmergencyService.createEmergency(req.body, ambulanceId, actor);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getEmergencyById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await EmergencyService.getEmergencyById(id);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async listEmergencies(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await EmergencyService.listEmergencies();
      return res.status(200).json(list);
    } catch (err) {
      next(err);
    }
  }

  static async rankMatches(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const emergency = await EmergencyService.getEmergencyById(id);
      const matches = await MatchingService.getMatches({
        type: emergency.type,
        resources: emergency.resources as ResourceKey[],
        location: emergency.location,
      });
      return res.status(200).json({
        emergencyId: id,
        matches,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMatches(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const emergency = await EmergencyService.getEmergencyById(id);
      const matches = await MatchingService.getMatches({
        type: emergency.type,
        resources: emergency.resources as ResourceKey[],
        location: emergency.location,
      });

      const recommendation = matches.length > 0 && matches[0].matchType !== "UNAVAILABLE"
        ? matches[0]
        : null;
      const alternatives = matches.slice(1);

      return res.status(200).json({
        emergencyId: id,
        recommendation,
        alternatives,
        matches,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getResponses(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { prisma } = await import("../config/database");
      const responses = await prisma.hospitalResponse.findMany({
        where: { emergencyId: id },
        include: { hospital: true },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json(responses);
    } catch (err) {
      next(err);
    }
  }

  static async getExplanation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, hospitalId } = req.params;
      const emergency = await EmergencyService.getEmergencyById(id);
      const matches = await MatchingService.getMatches({
        type: emergency.type,
        resources: emergency.resources as ResourceKey[],
        location: emergency.location,
      });
      const match = matches.find(
        (m) => m.hospital_id === hospitalId || m.hospitalId === hospitalId
      );
      const { HospitalService } = await import("../services/hospital.service");
      const hospital = await HospitalService.getHospitalById(hospitalId);
      const { GroqService } = await import("../services/groq.service");

      const explanation = await GroqService.explainMatch({
        hospital: hospital?.name || match?.hospital_name || hospitalId,
        resourceMatch:
          match?.fulfillmentPercentage ??
          Math.round((match?.components.resource ?? 1) * 100),
        etaMinutes: match?.eta_min ?? 7,
        distanceKm: match?.distance_km ?? 4.8,
        freshnessMinutes: match?.dataAgeMinutes ?? 2,
        load: hospital?.load_pct ?? 25,
        finalScore: match?.finalScore ?? Math.round((match?.total_score ?? 0.85) * 100),
      });

      return res.status(200).json({
        emergencyId: id,
        hospitalId,
        explanation,
      });
    } catch (err) {
      next(err);
    }
  }

  static async recordResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      // Section 44: Never trust hospitalId from browser if authenticated as hospital nurse
      let hospitalId = req.body.hospitalId || "h-city";
      const userRole = (req.user?.role || "").toUpperCase();
      if (req.user && (userRole === "HOSPITAL" || userRole === "HOSPITAL_NURSE")) {
        if (!req.user.hospitalId) {
          return res.status(403).json({
            message: "Hospital nurse account is missing an assigned hospitalId.",
          });
        }
        hospitalId = req.user.hospitalId;
      }

      const result = await EmergencyService.recordHospitalResponse(id, hospitalId, req.body);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async cancelEmergency(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actor = req.user?.username || "dispatcher";
      const result = await EmergencyService.cancelEmergency(id, actor);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
