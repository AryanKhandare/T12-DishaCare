import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { freshnessLevel } from "../utils/scoring";
import { HospitalService } from "../services/hospital.service";
import { ReservationService } from "../services/reservation.service";
import { MatchingService } from "../services/matching.service";

export class AdminController {
  static async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const now = Date.now();
      const hospitals = await HospitalService.listHospitals();
      const activeHospitals = hospitals.filter((h) => h.active);

      const requests = await prisma.emergencyRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      const reservations = await prisma.reservation.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      const fallbackEventsCount = await prisma.eventLog.count({
        where: { type: "FALLBACK" },
      });

      const activeEmergencies = requests.filter(
        (r) => r.status === "matching" || r.status === "reserving"
      ).length;

      const availableIcu = activeHospitals.reduce(
        (sum, h) => sum + (h.resources.icu?.available ?? 0),
        0
      );

      const pendingReservations = reservations.filter(
        (r) => r.status === "RESERVATION_REQUESTED"
      ).length;

      const staleListings = activeHospitals.filter(
        (h) => freshnessLevel((now - h.updated_at) / 1000) === "stale"
      ).length;

      const resolved = reservations.filter((r) => r.resolvedAt && r.status !== "CANCELLED");
      const accepted = reservations.filter((r) => r.status === "HELD" || r.status === "RELEASED");

      const avgResp = accepted.length
        ? accepted.reduce(
            (t, r) => t + ((r.resolvedAt ? r.resolvedAt.getTime() : r.startsAt.getTime()) - r.startsAt.getTime()),
            0
          ) /
          accepted.length /
          1000
        : 0;

      const reasonCounts: Record<string, number> = {};
      reservations
        .filter((r) => r.status === "REJECTED")
        .forEach((r) => {
          const list = r.rejectReasons && r.rejectReasons.length ? r.rejectReasons : ["unspecified"];
          list.forEach((x) => {
            reasonCounts[x] = (reasonCounts[x] ?? 0) + 1;
          });
        });

      const responded = reservations.filter((r) => r.respondedAt);
      const avgDecision = responded.length
        ? responded.reduce(
            (t, r) => t + (r.respondedAt!.getTime() - r.startsAt.getTime()),
            0
          ) /
          responded.length /
          1000
        : 0;

      return res.status(200).json({
        decline_reasons: reasonCounts,
        avg_decision_sec: Math.round(avgDecision),
        active_emergencies: activeEmergencies,
        available_icu: availableIcu,
        pending_reservations: pendingReservations,
        stale_listings: staleListings,
        requests_today: requests.length,
        successful_reservations: accepted.length,
        fallbacks: fallbackEventsCount,
        avg_response_sec: Math.round(avgResp),
        resolved: resolved.length,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getStale(req: Request, res: Response, next: NextFunction) {
    try {
      const now = Date.now();
      const hospitals = await HospitalService.listHospitals();
      const stale = hospitals.filter(
        (h) => h.active && freshnessLevel((now - h.updated_at) / 1000) === "stale"
      );
      return res.status(200).json(stale);
    } catch (err) {
      next(err);
    }
  }

  static async getReservations(req: Request, res: Response, next: NextFunction) {
    try {
      const reservations = await prisma.reservation.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return res.status(200).json(reservations.map((r) => ReservationService.formatReservation(r)));
    } catch (err) {
      next(err);
    }
  }

  static async explainMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { match, hospitalName } = req.body;
      const explanation = await MatchingService.explainMatch(match, hospitalName);
      return res.status(200).json({ explanation });
    } catch (err) {
      next(err);
    }
  }

  // ── Hospital management ──

  static async createHospital(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, name, area, address, phone, lat, lng, specialties, hospitalType, active } = req.body;
      if (!id || !name || !area || lat === undefined || lng === undefined) {
        return res.status(400).json({
          message: "id, name, area, lat, lng are required.",
          error: { code: "VALIDATION_ERROR" },
        });
      }
      const existing = await prisma.hospital.findUnique({ where: { id } });
      if (existing) {
        return res.status(409).json({
          message: `Hospital with id '${id}' already exists.`,
          error: { code: "DUPLICATE_HOSPITAL" },
        });
      }
      const hospital = await prisma.hospital.create({
        data: {
          id,
          name,
          area,
          address: address ?? null,
          phone: phone ?? null,
          lat,
          lng,
          specialties: specialties || [],
          hospitalType: hospitalType ?? "Multispeciality",
          active: active ?? true,
        },
      });
      // Create initial empty availability row
      await prisma.bedAvailability.create({
        data: {
          hospitalId: id,
          icuAvailable: 0,
          icuTotal: 10,
          ventilatorAvailable: 0,
          ventilatorTotal: 6,
          cardiacAvailable: 0,
          cardiacTotal: 1,
          oxygenAvailable: 0,
          oxygenTotal: 15,
          burnsAvailable: 0,
          burnsTotal: 1,
          lastUpdated: new Date(),
          updatedBy: req.user?.username ?? "admin",
        },
      });
      const formatted = await HospitalService.getHospitalById(id);
      return res.status(201).json(formatted);
    } catch (err) {
      next(err);
    }
  }

  static async updateHospital(req: Request, res: Response, next: NextFunction) {
    try {
      const { hospitalId } = req.params;
      const { name, area, address, phone, lat, lng, specialties, hospitalType, active, loadPct } = req.body;
      const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
      if (!hospital) {
        return res.status(404).json({ message: "Hospital not found", error: { code: "HOSPITAL_NOT_FOUND" } });
      }
      await prisma.hospital.update({
        where: { id: hospitalId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(area !== undefined ? { area } : {}),
          ...(address !== undefined ? { address } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(lat !== undefined ? { lat } : {}),
          ...(lng !== undefined ? { lng } : {}),
          ...(specialties !== undefined ? { specialties } : {}),
          ...(hospitalType !== undefined ? { hospitalType } : {}),
          ...(active !== undefined ? { active } : {}),
          ...(loadPct !== undefined ? { loadPct } : {}),
          updatedAt: new Date(),
        },
      });
      const formatted = await HospitalService.getHospitalById(hospitalId);
      return res.status(200).json(formatted);
    } catch (err) {
      next(err);
    }
  }

  static async toggleHospitalActive(req: Request, res: Response, next: NextFunction) {
    try {
      const { hospitalId } = req.params;
      const { active } = req.body;
      if (typeof active !== "boolean") {
        return res.status(400).json({ message: "active (boolean) is required.", error: { code: "VALIDATION_ERROR" } });
      }
      const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
      if (!hospital) {
        return res.status(404).json({ message: "Hospital not found", error: { code: "HOSPITAL_NOT_FOUND" } });
      }
      await prisma.hospital.update({ where: { id: hospitalId }, data: { active } });
      return res.status(200).json({ ok: true, hospitalId, active });
    } catch (err) {
      next(err);
    }
  }

  // ── User management ──

  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          hospitalId: true,
          ambulanceId: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json(
        users.map((u) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          email: u.email,
          phone: u.phone,
          role: u.role,
          hospital_id: u.hospitalId,
          hospitalId: u.hospitalId,
          ambulance_id: u.ambulanceId,
          is_active: u.isActive,
          created_at: u.createdAt,
        }))
      );
    } catch (err) {
      next(err);
    }
  }

  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const bcrypt = await import("bcryptjs");
      const { name, username, email, phone, password, role, hospitalId } = req.body;

      if (!name || !username || !password || !role) {
        return res.status(400).json({
          message: "name, username, password, role are required.",
          error: { code: "VALIDATION_ERROR" },
        });
      }

      const cleanUsername = username.trim().toLowerCase();
      const existingUser = await prisma.user.findUnique({ where: { username: cleanUsername } });
      if (existingUser) {
        return res.status(409).json({
          message: `Username '${cleanUsername}' already exists.`,
          error: { code: "DUPLICATE_USERNAME" },
        });
      }

      const roleUpper = role.toUpperCase();
      const canonicalRole = roleUpper === "HOSPITAL_NURSE" || roleUpper === "HOSPITAL" ? "hospital" : roleUpper === "ADMIN" ? "admin" : "dispatcher";

      if (canonicalRole === "hospital" && hospitalId) {
        const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
        if (!hospital) {
          return res.status(400).json({
            message: `Hospital '${hospitalId}' not found.`,
            error: { code: "INVALID_HOSPITAL" },
          });
        }
      }

      const passwordHash = await bcrypt.default.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name,
          username: cleanUsername,
          email: email?.trim().toLowerCase() ?? null,
          phone: phone ?? null,
          passwordHash,
          role: canonicalRole,
          hospitalId: canonicalRole === "hospital" ? hospitalId ?? null : null,
          ambulanceId: canonicalRole === "dispatcher" ? "A12" : null,
          isActive: true,
        },
      });

      return res.status(201).json({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        hospital_id: user.hospitalId,
        hospitalId: user.hospitalId,
        is_active: user.isActive,
      });
    } catch (err) {
      next(err);
    }
  }

  static async toggleUserActive(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { active } = req.body;
      if (typeof active !== "boolean") {
        return res.status(400).json({ message: "active (boolean) is required.", error: { code: "VALIDATION_ERROR" } });
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ message: "User not found", error: { code: "USER_NOT_FOUND" } });
      }
      await prisma.user.update({ where: { id: userId }, data: { isActive: active } });
      return res.status(200).json({ ok: true, userId, active });
    } catch (err) {
      next(err);
    }
  }
}
