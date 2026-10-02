import { prisma } from "../config/database";
import { env } from "../config/env";
import { safeGetIO } from "../sockets/socket";
import { EventService } from "./event.service";
import { MatchingService } from "./matching.service";
import { ResourceKey } from "../types";
import { logger } from "../utils/logger";

export class FallbackService {
  /**
   * Triggers automatic fallback for an emergency request after rejection or timeout.
   */
  static async triggerFallback(
    requestId: string,
    failedHospitalId: string,
    reason: "REJECTED" | "TIMEOUT"
  ) {
    const emergency = await prisma.emergencyRequest.findUnique({
      where: { id: requestId },
      include: { reservations: true },
    });

    if (!emergency || emergency.status === "cancelled" || emergency.status === "completed") {
      logger.info(`Fallback aborted: emergency ${requestId} is ${emergency?.status ?? "missing"}`);
      return null;
    }

    const failedHospital = await prisma.hospital.findUnique({
      where: { id: failedHospitalId },
    });

    // Collect all hospital IDs previously tried
    const triedHospitalIds = emergency.reservations.map((r) => r.hospitalId);
    if (!triedHospitalIds.includes(failedHospitalId)) {
      triedHospitalIds.push(failedHospitalId);
    }

    // Rank remaining hospitals excluding already attempted ones
    const matches = await MatchingService.getMatches(
      {
        type: emergency.type,
        resources: emergency.resources as ResourceKey[],
        location: { lat: emergency.lat, lng: emergency.lng },
      },
      triedHospitalIds
    );

    const io = safeGetIO();
    const ambulanceRoom = emergency.ambulanceId ? `ambulance:${emergency.ambulanceId}` : null;

    if (!matches || matches.length === 0) {
      // No more candidate hospitals remain
      await prisma.emergencyRequest.update({
        where: { id: requestId },
        data: { status: "failed" },
      });

      await EventService.logEvent({
        emergencyId: requestId,
        actor: "matching-engine",
        type: "NO_CANDIDATES",
        message: "No eligible hospitals remain for emergency request",
      });

      if (io && ambulanceRoom) {
        io.to(ambulanceRoom).emit("NO_HOSPITAL_AVAILABLE", {
          event: "NO_HOSPITAL_AVAILABLE",
          emergencyId: requestId,
          message: "No eligible hospitals available to fulfill the emergency requirements.",
        });
      }

      logger.warn(`No fallback hospitals available for emergency ${requestId}`);
      return null;
    }

    const nextMatch = matches[0];
    const nextHospital = await prisma.hospital.findUnique({
      where: { id: nextMatch.hospital_id },
    });

    const now = new Date();
    const timeoutSec = env.RESERVATION_TIMEOUT_SECONDS;
    const expiresAt = new Date(now.getTime() + timeoutSec * 1000);
    const attempt = emergency.reservations.length + 1;

    // Create next reservation in PENDING / RESERVATION_REQUESTED
    const newReservation = await prisma.reservation.create({
      data: {
        id: `RSV-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`,
        requestId,
        hospitalId: nextMatch.hospital_id,
        status: "RESERVATION_REQUESTED",
        score: nextMatch.total_score,
        attempt,
        startsAt: now,
        expiresAt,
        held: {},
      },
    });

    await prisma.emergencyRequest.update({
      where: { id: requestId },
      data: { status: "reserving" },
    });

    // Log the FALLBACK event
    await EventService.logEvent({
      emergencyId: requestId,
      hospitalId: nextMatch.hospital_id,
      reservationId: newReservation.id,
      actor: "matching-engine",
      type: "FALLBACK",
      message: `Fallback to next best match: ${nextHospital?.name || nextMatch.hospital_id} (${Math.round(
        nextMatch.total_score * 100
      )}%)`,
      metadata: {
        previousHospitalId: failedHospitalId,
        nextHospitalId: nextMatch.hospital_id,
        attempt,
        reason,
      },
    });

    // Log the new RESERVATION_REQUESTED event
    await EventService.logEvent({
      emergencyId: requestId,
      hospitalId: nextMatch.hospital_id,
      reservationId: newReservation.id,
      actor: "matching-engine",
      type: "RESERVATION_REQUESTED",
      message: `Bed requested at ${nextHospital?.name || nextMatch.hospital_id} (Attempt ${attempt})`,
      metadata: {
        attempt,
        score: Math.round(nextMatch.total_score * 100),
        expiresInSec: timeoutSec,
      },
    });

    if (io) {
      // Notify ambulance about fallback trigger
      if (ambulanceRoom) {
        io.to(ambulanceRoom).emit("FALLBACK_TRIGGERED", {
          event: "FALLBACK_TRIGGERED",
          emergencyId: requestId,
          previousHospital: failedHospital?.name || failedHospitalId,
          nextHospital: nextHospital?.name || nextMatch.hospital_id,
          nextHospitalId: nextMatch.hospital_id,
          score: nextMatch.total_score,
          attempt,
          reservationId: newReservation.id,
          expiresAt: expiresAt.getTime(),
        });
      }

      // Notify next hospital room with reservation request
      const nextHospitalRoom = `hospital:${nextMatch.hospital_id}`;
      io.to(nextHospitalRoom).emit("RESERVATION_REQUEST", {
        event: "RESERVATION_REQUEST",
        reservationId: newReservation.id,
        emergencyId: requestId,
        hospitalId: nextMatch.hospital_id,
        score: nextMatch.total_score,
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
          reservation_ids: [newReservation.id],
        },
      });
    }

    logger.info(
      `Automatic fallback initiated: Emergency ${requestId} routed from ${failedHospitalId} to ${nextMatch.hospital_id} (RSV: ${newReservation.id})`
    );

    return newReservation;
  }
}
