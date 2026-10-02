import { safeGetIO } from "../sockets/socket";
import { MatchResult } from "../types";
import { EventService } from "./event.service";
import { logger } from "../utils/logger";

export interface EmergencyBroadcastPayload {
  id: string;
  ambulanceId: string;
  type: string;
  severity: string;
  age?: number | null;
  gender?: string | null;
  lat: number;
  lng: number;
  locationLabel: string;
  requiresIcu: boolean;
  requiresVentilator: boolean;
  requiresCardiac: boolean;
  requiresOxygen: boolean;
  requiresBurns: boolean;
  resources: string[];
}

export class BroadcastService {
  /**
   * Broadcasts the new emergency request to eligible nearby hospitals via Socket.IO
   * and notifies the requesting ambulance with ranked matching results.
   */
  static async broadcastEmergency(emergency: EmergencyBroadcastPayload, matches: MatchResult[]) {
    const io = safeGetIO();

    // 1. Log MATCHES_RANKED event
    await EventService.logEvent({
      emergencyId: emergency.id,
      actor: "matching-engine",
      type: "MATCHES_RANKED",
      message: `${matches.length} eligible hospitals ranked`,
      metadata: {
        top: matches[0]?.hospital_name || matches[0]?.hospital_id || "none",
        candidatesCount: matches.length,
      },
    });

    // 2. Log EMERGENCY_BROADCAST event
    await EventService.logEvent({
      emergencyId: emergency.id,
      actor: "system",
      type: "EMERGENCY_BROADCAST",
      message: `Emergency broadcast to ${matches.length} candidate hospitals`,
      metadata: {
        hospitalIds: matches.map((m) => m.hospital_id),
      },
    });

    if (!io) {
      logger.warn("Socket.IO not initialized; skipping live socket broadcast");
      return;
    }

    // 3. Emit NEW_EMERGENCY to each hospital room
    matches.forEach((m) => {
      const room = `hospital:${m.hospital_id}`;
      const payload = {
        event: "NEW_EMERGENCY",
        emergencyId: emergency.id,
        ambulanceId: emergency.ambulanceId,
        type: emergency.type,
        severity: emergency.severity,
        age: emergency.age,
        gender: emergency.gender,
        resources: emergency.resources,
        requirements: {
          icu: emergency.requiresIcu,
          ventilator: emergency.requiresVentilator,
          oxygen: emergency.requiresOxygen,
          cardiac: emergency.requiresCardiac,
          burns: emergency.requiresBurns,
        },
        ambulanceLocation: {
          lat: emergency.lat,
          lng: emergency.lng,
          label: emergency.locationLabel,
        },
        etaMinutes: m.eta_min,
        distanceKm: m.distance_km,
        timestamp: Date.now(),
      };

      io.to(room).emit("NEW_EMERGENCY", payload);
      logger.info(`Broadcast NEW_EMERGENCY to ${room}`);
    });

    // 4. Emit MATCHING_COMPLETED to ambulance room
    const ambulanceRoom = `ambulance:${emergency.ambulanceId}`;
    io.to(ambulanceRoom).emit("MATCHING_COMPLETED", {
      event: "MATCHING_COMPLETED",
      emergencyId: emergency.id,
      hospitals: matches.map((m) => ({
        hospitalId: m.hospital_id,
        hospitalName: m.hospital_name || m.hospital_id,
        rank: m.rank,
        matchScore: m.total_score,
        etaMinutes: m.eta_min,
        distanceKm: m.distance_km,
        reasons: m.reasons,
        components: m.components,
      })),
    });
    logger.info(`Emitted MATCHING_COMPLETED to ${ambulanceRoom}`);
  }

  /**
   * Broadcast hospital response when hospital staff confirms requirements
   */
  static async broadcastHospitalResponse(
    emergencyId: string,
    ambulanceId: string,
    response: {
      hospitalId: string;
      hospitalName: string;
      requirementsFulfilled: number;
      requirementsTotal: number;
      fulfillmentPercentage: number;
      matchScore?: number;
    }
  ) {
    const io = safeGetIO();
    if (!io) return;

    const ambulanceRoom = `ambulance:${ambulanceId}`;
    io.to(ambulanceRoom).emit("HOSPITAL_RESPONSE_RECEIVED", {
      event: "HOSPITAL_RESPONSE_RECEIVED",
      emergencyId,
      ...response,
    });
    logger.info(`Emitted HOSPITAL_RESPONSE_RECEIVED to ${ambulanceRoom}`);
  }
}
