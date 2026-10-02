import { prisma } from "../config/database";
import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";
import { ResourceKey, TOGGLE_RESOURCES } from "../types";
import { safeGetIO } from "../sockets/socket";
import { EventService } from "./event.service";
import { FallbackService } from "./fallback.service";
import { MatchingService } from "./matching.service";
import { HospitalService } from "./hospital.service";
import { logger } from "../utils/logger";

export class ReservationService {
  /**
   * Creates a new bed hold reservation request for a selected hospital.
   */
  static async createReservation(requestId: string, hospitalId: string, actor: string) {
    const emergency = await prisma.emergencyRequest.findUnique({
      where: { id: requestId },
      include: { reservations: true },
    });

    if (!emergency) {
      throw new AppError("Emergency request not found", 404, "EMERGENCY_NOT_FOUND");
    }

    if (emergency.status === "cancelled" || emergency.status === "completed") {
      throw new AppError(`Cannot reserve bed for emergency with status '${emergency.status}'`, 400, "INVALID_STATE");
    }

    // Check if there is already an active reservation requested
    const existingLive = emergency.reservations.find((r) => r.status === "RESERVATION_REQUESTED");
    if (existingLive) {
      return this.formatReservation(existingLive);
    }

    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) {
      throw new AppError("Hospital not found", 404, "HOSPITAL_NOT_FOUND");
    }

    // Calculate score
    const matches = await MatchingService.getMatches({
      type: emergency.type,
      resources: emergency.resources as ResourceKey[],
      location: { lat: emergency.lat, lng: emergency.lng },
    });
    const match = matches.find((m) => m.hospital_id === hospitalId);

    const now = new Date();
    const timeoutSec = env.RESERVATION_TIMEOUT_SECONDS;
    const expiresAt = new Date(now.getTime() + timeoutSec * 1000);
    const attempt = emergency.reservations.length + 1;
    const reservationId = `RSV-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;

    const reservation = await prisma.reservation.create({
      data: {
        id: reservationId,
        requestId,
        hospitalId,
        status: "RESERVATION_REQUESTED",
        score: match?.total_score ?? 0,
        attempt,
        startsAt: now,
        expiresAt,
        held: {},
      },
      include: { emergency: true },
    });

    await prisma.emergencyRequest.update({
      where: { id: requestId },
      data: { status: "reserving" },
    });

    // Log the reservation requested event
    await EventService.logEvent({
      emergencyId: requestId,
      hospitalId,
      reservationId: reservation.id,
      actor,
      type: "RESERVATION_REQUESTED",
      message: `Bed requested at ${hospital.name}`,
      metadata: {
        attempt,
        score: Math.round((match?.total_score ?? 0) * 100),
        expires_in: `${String(Math.floor(timeoutSec / 60)).padStart(2, "0")}:${String(timeoutSec % 60).padStart(2, "0")}`,
      },
    });

    // Notify through Socket.IO
    const io = safeGetIO();
    if (io) {
      // Notify hospital room
      const hospitalRoom = `hospital:${hospitalId}`;
      io.to(hospitalRoom).emit("RESERVATION_REQUEST", {
        event: "RESERVATION_REQUEST",
        reservationId: reservation.id,
        emergencyId: requestId,
        hospitalId,
        score: reservation.score,
        attempt,
        startsAt: now.getTime(),
        expiresAt: expiresAt.getTime(),
        expiresInSec: timeoutSec,
        requiredResources: emergency.resources,
        emergency: {
          id: emergency.id,
          ambulance_id: emergency.ambulanceId || "A12",
          type: emergency.type,
          severity: emergency.severity,
          age: emergency.age ?? undefined,
          gender: emergency.gender ?? undefined,
          resources: (emergency.resources as any) || [],
          location: {
            lat: emergency.lat,
            lng: emergency.lng,
            label: emergency.locationLabel,
          },
          status: emergency.status,
          created_at: new Date(emergency.createdAt).getTime(),
          reservation_ids: [reservation.id],
        },
      });

      // Notify ambulance room
      if (emergency.ambulanceId) {
        io.to(`ambulance:${emergency.ambulanceId}`).emit("RESERVATION_PENDING", {
          event: "RESERVATION_PENDING",
          reservationId: reservation.id,
          emergencyId: requestId,
          hospitalId,
          hospitalName: hospital.name,
          expiresAt: expiresAt.getTime(),
          attempt,
        });
      }
    }

    return this.formatReservation(reservation);
  }

  /**
   * Accepts a reservation atomically with concurrency and resource availability verification.
   */
  static async acceptReservation(reservationId: string, actor: string) {
    const now = new Date();

    return await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: {
          emergency: true,
          hospital: { include: { availability: true } },
        },
      });

      if (!reservation) {
        throw new AppError("Reservation not found", 404, "RESERVATION_NOT_FOUND");
      }

      if (reservation.status !== "RESERVATION_REQUESTED") {
        throw new AppError(
          `Reservation cannot be accepted in current status '${reservation.status}'`,
          400,
          "INVALID_RESERVATION_STATUS"
        );
      }

      if (reservation.expiresAt.getTime() <= now.getTime()) {
        throw new AppError("Reservation has already expired", 400, "RESERVATION_EXPIRED");
      }

      const avail = await tx.bedAvailability.findUnique({
        where: { hospitalId: reservation.hospitalId },
      });

      if (!avail) {
        throw new AppError("Hospital availability record not found", 404, "AVAILABILITY_NOT_FOUND");
      }

      const neededResources = (reservation.emergency.resources as ResourceKey[]) || [];
      const held: Partial<Record<ResourceKey, number>> = {};

      // Concurrency check: verify required beds are available
      for (const resKey of neededResources) {
        if (TOGGLE_RESOURCES.includes(resKey)) {
          if (resKey === "cardiac" && avail.cardiacAvailable <= 0) {
            throw new AppError(
              "Cardiac unit is no longer available at this hospital.",
              409,
              "RESOURCE_NO_LONGER_AVAILABLE"
            );
          }
          if (resKey === "burns" && avail.burnsAvailable <= 0) {
            throw new AppError(
              "Burns unit is no longer available at this hospital.",
              409,
              "RESOURCE_NO_LONGER_AVAILABLE"
            );
          }
        } else {
          // Countable bed/device
          if (resKey === "icu") {
            if (avail.icuAvailable < 1) {
              throw new AppError(
                "ICU bed is no longer available at this hospital.",
                409,
                "RESOURCE_NO_LONGER_AVAILABLE"
              );
            }
            held.icu = 1;
          } else if (resKey === "ventilator") {
            if (avail.ventilatorAvailable < 1) {
              throw new AppError(
                "Ventilator is no longer available at this hospital.",
                409,
                "RESOURCE_NO_LONGER_AVAILABLE"
              );
            }
            held.ventilator = 1;
          } else if (resKey === "oxygen") {
            if (avail.oxygenAvailable < 1) {
              throw new AppError(
                "Oxygen point is no longer available at this hospital.",
                409,
                "RESOURCE_NO_LONGER_AVAILABLE"
              );
            }
            held.oxygen = 1;
          }
        }
      }

      // Decrement available capacity atomically
      const updatedAvail = await tx.bedAvailability.update({
        where: { hospitalId: reservation.hospitalId },
        data: {
          icuAvailable: held.icu ? { decrement: held.icu } : undefined,
          ventilatorAvailable: held.ventilator ? { decrement: held.ventilator } : undefined,
          oxygenAvailable: held.oxygen ? { decrement: held.oxygen } : undefined,
          lastUpdated: now,
          updatedBy: actor,
        },
      });

      // Strict concurrency guard: if concurrent transactions depleted the resource past zero, abort with 409
      if (held.icu && updatedAvail.icuAvailable < 0) {
        throw new AppError("ICU bed is no longer available at this hospital.", 409, "RESOURCE_NO_LONGER_AVAILABLE");
      }
      if (held.ventilator && updatedAvail.ventilatorAvailable < 0) {
        throw new AppError("Ventilator is no longer available at this hospital.", 409, "RESOURCE_NO_LONGER_AVAILABLE");
      }
      if (held.oxygen && updatedAvail.oxygenAvailable < 0) {
        throw new AppError("Oxygen point is no longer available at this hospital.", 409, "RESOURCE_NO_LONGER_AVAILABLE");
      }

      // Update reservation state to HELD
      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: "HELD",
          resolvedAt: now,
          respondedAt: now,
          respondedBy: actor,
          held: held as any,
        },
      });

      // Update emergency request state to held
      await tx.emergencyRequest.update({
        where: { id: reservation.requestId },
        data: { status: "held" },
      });

      // Create event logs
      await tx.eventLog.create({
        data: {
          ts: BigInt(now.getTime()),
          requestId: reservation.requestId,
          hospitalId: reservation.hospitalId,
          reservationId: reservation.id,
          actor: "system",
          type: "HELD",
          message: `Bed held at ${reservation.hospital.name} — ${
            Object.keys(held).join(", ") || "unit"
          } allocated`,
          metadata: held as any,
        },
      });

      await tx.eventLog.create({
        data: {
          ts: BigInt(now.getTime() + 1),
          requestId: reservation.requestId,
          hospitalId: reservation.hospitalId,
          reservationId: reservation.id,
          actor,
          type: "ACCEPTED",
          message: `${reservation.hospital.name} accepted the request`,
        },
      });

      // Emit real-time events via Socket.IO
      const io = safeGetIO();
      if (io) {
        if (reservation.emergency.ambulanceId) {
          io.to(`ambulance:${reservation.emergency.ambulanceId}`).emit("RESERVATION_ACCEPTED", {
            event: "RESERVATION_ACCEPTED",
            reservationId: reservation.id,
            emergencyId: reservation.requestId,
            hospitalId: reservation.hospitalId,
            hospitalName: reservation.hospital.name,
            heldResources: held,
            resolvedAt: now.getTime(),
          });
        }

        io.emit("BED_HELD", {
          event: "BED_HELD",
          reservationId: reservation.id,
          hospitalId: reservation.hospitalId,
          held,
        });

        // Broadcast updated availability for the hospital
        const formattedHosp = await HospitalService.getHospitalById(reservation.hospitalId);
        io.emit("AVAILABILITY_UPDATED", {
          event: "AVAILABILITY_UPDATED",
          hospitalId: reservation.hospitalId,
          hospitalName: reservation.hospital.name,
          patch: {},
          resources: formattedHosp.resources,
          updatedAt: now.getTime(),
        });
      }

      return this.formatReservation(updatedReservation);
    });
  }

  /**
   * Rejects a reservation and triggers automatic fallback to next hospital.
   */
  static async rejectReservation(
    reservationId: string,
    actor: string,
    reasons: string[] = [],
    note?: string
  ) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { emergency: true, hospital: true },
    });

    if (!reservation) {
      throw new AppError("Reservation not found", 404, "RESERVATION_NOT_FOUND");
    }

    if (reservation.status !== "RESERVATION_REQUESTED") {
      throw new AppError(
        `Cannot reject reservation in status '${reservation.status}'`,
        400,
        "INVALID_STATE"
      );
    }

    const now = new Date();
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: "REJECTED",
        resolvedAt: now,
        respondedAt: now,
        respondedBy: actor,
        rejectReasons: reasons,
        rejectNote: note,
      },
    });

    // Log REJECTED event
    await EventService.logEvent({
      emergencyId: reservation.requestId,
      hospitalId: reservation.hospitalId,
      reservationId: reservation.id,
      actor,
      type: "REJECTED",
      message: `${reservation.hospital.name} declined the request${
        reasons.length ? `: ${reasons.join(", ")}` : ""
      }${note ? ` (“${note}”)` : ""}`,
      metadata: { reasons, note },
    });

    // Notify ambulance
    const io = safeGetIO();
    if (io && reservation.emergency.ambulanceId) {
      io.to(`ambulance:${reservation.emergency.ambulanceId}`).emit("RESERVATION_REJECTED", {
        event: "RESERVATION_REJECTED",
        reservationId: reservation.id,
        emergencyId: reservation.requestId,
        hospitalId: reservation.hospitalId,
        hospitalName: reservation.hospital.name,
        reasons,
        note,
      });
    }

    // Trigger automatic fallback
    const fallbackReservation = await FallbackService.triggerFallback(
      reservation.requestId,
      reservation.hospitalId,
      "REJECTED"
    );

    return {
      id: reservation.id,
      status: "REJECTED",
      fallback_initiated: !!fallbackReservation,
      next_hospital_id: fallbackReservation?.hospitalId,
    };
  }

  /**
   * Expires a reservation (timeout after 2 minutes) and triggers automatic fallback.
   */
  static async expireReservation(reservationId: string, actor = "system") {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { emergency: true, hospital: true },
    });

    if (!reservation || reservation.status !== "RESERVATION_REQUESTED") {
      return null;
    }

    const now = new Date();
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: "TIMEOUT",
        resolvedAt: now,
      },
    });

    // Log TIMEOUT event
    await EventService.logEvent({
      emergencyId: reservation.requestId,
      hospitalId: reservation.hospitalId,
      reservationId: reservation.id,
      actor,
      type: "TIMEOUT",
      message: `${reservation.hospital.name} did not respond within ${env.RESERVATION_TIMEOUT_SECONDS}s`,
    });

    // Notify via Socket.IO
    const io = safeGetIO();
    if (io) {
      if (reservation.emergency.ambulanceId) {
        io.to(`ambulance:${reservation.emergency.ambulanceId}`).emit("RESERVATION_EXPIRED", {
          event: "RESERVATION_EXPIRED",
          reservationId: reservation.id,
          emergencyId: reservation.requestId,
          hospitalId: reservation.hospitalId,
          hospitalName: reservation.hospital.name,
          expiredAt: now.getTime(),
        });
      }
      io.to(`hospital:${reservation.hospitalId}`).emit("RESERVATION_EXPIRED", {
        event: "RESERVATION_EXPIRED",
        reservationId: reservation.id,
        emergencyId: reservation.requestId,
      });
    }

    // Trigger automatic fallback
    const fallbackReservation = await FallbackService.triggerFallback(
      reservation.requestId,
      reservation.hospitalId,
      "TIMEOUT"
    );

    return {
      id: reservation.id,
      status: "TIMEOUT",
      fallback_initiated: !!fallbackReservation,
      next_hospital_id: fallbackReservation?.hospitalId,
    };
  }

  /**
   * Mark ambulance arrival at hospital
   */
  static async markArrived(reservationId: string, actor: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { hospital: true, emergency: true },
    });

    if (!reservation || reservation.status !== "HELD" || reservation.arrivedAt) {
      throw new AppError("Invalid reservation for arrival confirmation", 400, "INVALID_STATE");
    }

    const now = new Date();
    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { arrivedAt: now },
    });

    await prisma.emergencyRequest.update({
      where: { id: reservation.requestId },
      data: { status: "completed" },
    });

    await EventService.logEvent({
      emergencyId: reservation.requestId,
      hospitalId: reservation.hospitalId,
      reservationId,
      actor,
      type: "ARRIVED",
      message: `Ambulance arrived at ${reservation.hospital.name} — hold converted to admitted bed`,
    });

    return this.formatReservation(updated);
  }

  /**
   * Release a bed hold back to hospital availability
   */
  static async releaseReservation(reservationId: string, actor: string, reason?: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { hospital: true },
    });

    if (!reservation || reservation.status !== "HELD" || reservation.arrivedAt) {
      throw new AppError("Reservation cannot be released in current state", 400, "INVALID_STATE");
    }

    const held = (reservation.held as Record<ResourceKey, number>) || {};

    // Restore capacity in bed_availabilities
    await prisma.bedAvailability.update({
      where: { hospitalId: reservation.hospitalId },
      data: {
        icuAvailable: held.icu ? { increment: held.icu } : undefined,
        ventilatorAvailable: held.ventilator ? { increment: held.ventilator } : undefined,
        oxygenAvailable: held.oxygen ? { increment: held.oxygen } : undefined,
      },
    });

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: "RELEASED",
        releaseReason: reason,
      },
    });

    await EventService.logEvent({
      emergencyId: reservation.requestId,
      hospitalId: reservation.hospitalId,
      reservationId,
      actor,
      type: "RELEASED",
      message: `Hold released at ${reservation.hospital.name}${reason ? ` — ${reason}` : ""}`,
    });

    const io = safeGetIO();
    if (io) {
      io.emit("BED_RELEASED", {
        event: "BED_RELEASED",
        reservationId,
        hospitalId: reservation.hospitalId,
        reason,
      });

      const formattedHosp = await HospitalService.getHospitalById(reservation.hospitalId);
      io.emit("AVAILABILITY_UPDATED", {
        event: "AVAILABILITY_UPDATED",
        hospitalId: reservation.hospitalId,
        hospitalName: reservation.hospital.name,
        patch: {},
        resources: formattedHosp.resources,
        updatedAt: Date.now(),
      });
    }

    return this.formatReservation(updated);
  }

  /**
   * Formats database Reservation model to frontend Reservation interface
   */
  public static formatReservation(r: any) {
    return {
      id: r.id,
      request_id: r.requestId,
      hospital_id: r.hospitalId,
      status: r.status,
      created_at: new Date(r.createdAt).getTime(),
      starts_at: new Date(r.startsAt).getTime(),
      expires_at: new Date(r.expiresAt).getTime(),
      score: r.score,
      attempt: r.attempt,
      held: (r.held as any) || {},
      resolved_at: r.resolvedAt ? new Date(r.resolvedAt).getTime() : undefined,
      responded_at: r.respondedAt ? new Date(r.respondedAt).getTime() : undefined,
      responded_by: r.respondedBy ?? undefined,
      arrived_at: r.arrivedAt ? new Date(r.arrivedAt).getTime() : undefined,
      viewed_at: r.viewedAt ? new Date(r.viewedAt).getTime() : undefined,
      reject_reasons: r.rejectReasons || [],
      reject_note: r.rejectNote ?? undefined,
      release_reason: r.releaseReason ?? undefined,
      emergency: r.emergency ? {
        id: r.emergency.id,
        ambulance_id: r.emergency.ambulanceId || "A12",
        type: r.emergency.type,
        severity: r.emergency.severity,
        age: r.emergency.age ?? undefined,
        gender: r.emergency.gender ?? undefined,
        resources: (r.emergency.resources as any) || [],
        location: {
          lat: r.emergency.lat,
          lng: r.emergency.lng,
          label: r.emergency.locationLabel,
        },
        status: r.emergency.status,
        created_at: new Date(r.emergency.createdAt).getTime(),
        reservation_ids: [r.id],
      } : undefined,
    };
  }

  /**
   * Retrieves single reservation by ID
   */
  static async getReservationById(reservationId: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        emergency: true,
        hospital: { include: { availability: true } },
      },
    });

    if (!reservation) {
      throw new AppError("Reservation not found", 404, "RESERVATION_NOT_FOUND");
    }

    return {
      ...this.formatReservation(reservation),
      hospital: reservation.hospital,
      emergency: reservation.emergency,
    };
  }

  /**
   * Periodic scheduler tick: checks for expired reservations
   */
  static async checkExpiredReservations() {
    try {
      const now = new Date();
      const expiredList = await prisma.reservation.findMany({
        where: {
          status: "RESERVATION_REQUESTED",
          expiresAt: { lte: now },
        },
      });

      for (const res of expiredList) {
        await this.expireReservation(res.id, "system-scheduler");
      }
    } catch (err) {
      logger.error("Error during checkExpiredReservations tick", err);
    }
  }
}
