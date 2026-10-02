import { prisma } from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { EmergencyRequestInput, ResourceKey } from "../types";
import { isValidCoordinate } from "../utils/distance";
import { EventService } from "./event.service";
import { MatchingService } from "./matching.service";
import { BroadcastService } from "./broadcast.service";
import { safeGetIO } from "../sockets/socket";

export class EmergencyService {
  /**
   * Creates a new emergency request, saves it in PostgreSQL,
   * finds eligible nearby hospitals, and immediately broadcasts to hospital rooms.
   */
  static async createEmergency(
    input: EmergencyRequestInput,
    ambulanceId = "A12",
    actor = "system"
  ) {
    if (!isValidCoordinate(input.location.lat, input.location.lng)) {
      throw new AppError("Invalid GPS coordinates provided for emergency", 400, "INVALID_COORDINATES");
    }

    const resources = input.resources || [];
    const requiresIcu = resources.includes("icu");
    const requiresVentilator = resources.includes("ventilator");
    const requiresCardiac = resources.includes("cardiac");
    const requiresOxygen = resources.includes("oxygen");
    const requiresBurns = resources.includes("burns");

    const id = `REQ-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    const emergency = await prisma.emergencyRequest.create({
      data: {
        id,
        ambulanceId,
        age: input.age,
        gender: input.gender,
        type: input.type,
        severity: input.severity,
        lat: input.location.lat,
        lng: input.location.lng,
        locationLabel: input.location.label || `${input.location.lat.toFixed(4)}, ${input.location.lng.toFixed(4)}`,
        requiresIcu,
        requiresVentilator,
        requiresCardiac,
        requiresOxygen,
        requiresBurns,
        resources,
        status: "matching",
        createdBy: actor,
        createdAt: now,
      },
      include: { reservations: true },
    });

    // Log the REQUEST_CREATED event
    await EventService.logEvent({
      emergencyId: emergency.id,
      actor,
      type: "REQUEST_CREATED",
      message: `${input.type} request created (${input.severity})`,
      metadata: {
        ambulance: ambulanceId,
        resources: resources.join(", ") || "none",
        severity: input.severity,
      },
    });

    // Find eligible nearby hospitals and rank them
    const matches = await MatchingService.getMatches({
      type: input.type,
      resources: resources as ResourceKey[],
      location: { lat: input.location.lat, lng: input.location.lng },
    });

    // Start hospital broadcast via Socket.IO
    await BroadcastService.broadcastEmergency(
      {
        id: emergency.id,
        ambulanceId,
        type: emergency.type,
        severity: emergency.severity,
        age: emergency.age,
        gender: emergency.gender,
        lat: emergency.lat,
        lng: emergency.lng,
        locationLabel: emergency.locationLabel,
        requiresIcu,
        requiresVentilator,
        requiresCardiac,
        requiresOxygen,
        requiresBurns,
        resources,
      },
      matches
    );

    const recommendation = matches.length > 0 && matches[0].matchType !== "UNAVAILABLE"
      ? matches[0]
      : null;
    const alternatives = matches.slice(1);

    return {
      ...this.formatEmergency(emergency),
      recommendation,
      alternatives,
      matches,
    };
  }

  static async getEmergencyById(id: string) {
    const emergency = await prisma.emergencyRequest.findUnique({
      where: { id },
      include: { reservations: true, responses: true },
    });

    if (!emergency) {
      throw new AppError("Emergency request not found", 404, "EMERGENCY_NOT_FOUND");
    }

    const matches = await MatchingService.getMatches({
      type: emergency.type,
      resources: emergency.resources as ResourceKey[],
      location: { lat: emergency.lat, lng: emergency.lng },
    });

    return {
      ...this.formatEmergency(emergency),
      matches,
    };
  }

  static async listEmergencies() {
    const list = await prisma.emergencyRequest.findMany({
      include: { reservations: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return list.map((e) => this.formatEmergency(e));
  }

  /**
   * Hospital staff response during the emergency broadcast phase
   */
  static async recordHospitalResponse(
    emergencyId: string,
    hospitalId: string,
    capabilities: {
      icu?: boolean;
      ventilator?: boolean;
      oxygen?: boolean;
      cardiac?: boolean;
      burns?: boolean;
    }
  ) {
    const emergency = await prisma.emergencyRequest.findUnique({
      where: { id: emergencyId },
    });

    if (!emergency) {
      throw new AppError("Emergency request not found", 404, "EMERGENCY_NOT_FOUND");
    }

    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) {
      throw new AppError("Hospital not found", 404, "HOSPITAL_NOT_FOUND");
    }

    // Calculate requirements fulfilled based on what the emergency requested
    const needed = emergency.resources || [];
    let fulfilledCount = 0;
    const totalCount = needed.length || 1;

    for (const resKey of needed) {
      if ((capabilities as any)[resKey] === true) {
        fulfilledCount++;
      }
    }

    const fulfillmentPercentage = Math.round((fulfilledCount / totalCount) * 100);

    const hospitalResponse = await prisma.hospitalResponse.create({
      data: {
        emergencyId,
        hospitalId,
        icu: capabilities.icu ?? false,
        ventilator: capabilities.ventilator ?? false,
        oxygen: capabilities.oxygen ?? false,
        cardiac: capabilities.cardiac ?? false,
        burns: capabilities.burns ?? false,
        requirementsFulfilled: fulfilledCount,
        requirementsTotal: totalCount,
        fulfillmentPercentage,
        status: "RECORDED",
      },
    });

    // Log the event
    await EventService.logEvent({
      emergencyId,
      hospitalId,
      actor: hospital.name,
      type: "HOSPITAL_RESPONSE_RECEIVED",
      message: `${hospital.name} confirmed fulfillment: ${fulfilledCount}/${totalCount} (${fulfillmentPercentage}%)`,
      metadata: {
        fulfillmentPercentage,
        capabilities,
      },
    });

    // Notify ambulance of hospital response
    if (emergency.ambulanceId) {
      await BroadcastService.broadcastHospitalResponse(emergencyId, emergency.ambulanceId, {
        hospitalId,
        hospitalName: hospital.name,
        requirementsFulfilled: fulfilledCount,
        requirementsTotal: totalCount,
        fulfillmentPercentage,
      });

      // Recalculate matching and emit MATCHING_UPDATE (Sections 23 & 24)
      const updatedMatches = await MatchingService.getMatches({
        type: emergency.type,
        resources: emergency.resources as ResourceKey[],
        location: { lat: emergency.lat, lng: emergency.lng },
      });
      const { ConnectionManager } = await import("../realtime/connectionManager");
      ConnectionManager.broadcastMatchUpdate(emergencyId, emergency.ambulanceId, updatedMatches);
    }

    return {
      ...hospitalResponse,
      hospitalId,
      fulfillmentPercentage,
      isFullyEligible: fulfillmentPercentage === 100,
      response: hospitalResponse,
    };
  }

  /**
   * Cancels an emergency request
   */
  static async cancelEmergency(emergencyId: string, actor: string) {
    const emergency = await prisma.emergencyRequest.findUnique({
      where: { id: emergencyId },
      include: { reservations: true },
    });

    if (!emergency) {
      throw new AppError("Emergency request not found", 404, "EMERGENCY_NOT_FOUND");
    }

    const now = new Date();

    // Cancel active reservations
    for (const r of emergency.reservations) {
      if (r.status === "RESERVATION_REQUESTED") {
        await prisma.reservation.update({
          where: { id: r.id },
          data: { status: "CANCELLED", resolvedAt: now },
        });

        const io = safeGetIO();
        if (io) {
          io.to(`hospital:${r.hospitalId}`).emit("RESERVATION_CANCELLED", {
            event: "RESERVATION_CANCELLED",
            reservationId: r.id,
            emergencyId,
            reason: `Emergency cancelled by ${actor}`,
          });
        }
      }
    }

    const updated = await prisma.emergencyRequest.update({
      where: { id: emergencyId },
      data: { status: "cancelled" },
    });

    await EventService.logEvent({
      emergencyId,
      actor,
      type: "CANCELLED",
      message: "Request cancelled by dispatcher",
    });

    return { ok: true, status: updated.status };
  }

  private static formatEmergency(e: any) {
    return {
      id: e.id,
      ambulance_id: e.ambulanceId || "A12",
      type: e.type,
      severity: e.severity,
      age: e.age ?? undefined,
      gender: e.gender ?? undefined,
      resources: (e.resources as ResourceKey[]) || [],
      location: {
        lat: e.lat,
        lng: e.lng,
        label: e.locationLabel,
      },
      status: e.status,
      created_at: new Date(e.createdAt).getTime(),
      reservation_ids: (e.reservations || []).map((r: any) => r.id),
    };
  }
}
