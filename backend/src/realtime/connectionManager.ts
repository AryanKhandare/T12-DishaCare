import { Socket } from "socket.io";
import { safeGetIO } from "../sockets/socket";
import { MatchResult } from "../types";
import { logger } from "../utils/logger";

export class ConnectionManager {
  private static hospitalSockets = new Map<string, Set<string>>();
  private static ambulanceSockets = new Map<string, Set<string>>();

  static registerClient(
    socket: Socket,
    hospitalId?: string | null,
    ambulanceId?: string | null
  ) {
    if (hospitalId) {
      if (!this.hospitalSockets.has(hospitalId)) {
        this.hospitalSockets.set(hospitalId, new Set());
      }
      this.hospitalSockets.get(hospitalId)!.add(socket.id);
      socket.join(`hospital:${hospitalId}`);
      logger.info(`[ConnectionManager] Socket ${socket.id} registered for hospital ${hospitalId}`);
    }

    if (ambulanceId) {
      if (!this.ambulanceSockets.has(ambulanceId)) {
        this.ambulanceSockets.set(ambulanceId, new Set());
      }
      this.ambulanceSockets.get(ambulanceId)!.add(socket.id);
      socket.join(`ambulance:${ambulanceId}`);
      logger.info(`[ConnectionManager] Socket ${socket.id} registered for ambulance ${ambulanceId}`);
    }
  }

  static unregisterClient(socketId: string) {
    for (const [hId, set] of this.hospitalSockets.entries()) {
      if (set.has(socketId)) {
        set.delete(socketId);
        if (set.size === 0) this.hospitalSockets.delete(hId);
      }
    }
    for (const [aId, set] of this.ambulanceSockets.entries()) {
      if (set.has(socketId)) {
        set.delete(socketId);
        if (set.size === 0) this.ambulanceSockets.delete(aId);
      }
    }
  }

  static isHospitalConnected(hospitalId: string): boolean {
    const sockets = this.hospitalSockets.get(hospitalId);
    return !!sockets && sockets.size > 0;
  }

  static isAmbulanceConnected(ambulanceId: string): boolean {
    const sockets = this.ambulanceSockets.get(ambulanceId);
    return !!sockets && sockets.size > 0;
  }

  static sendToHospital(hospitalId: string, event: string, payload: any) {
    const io = safeGetIO();
    if (!io) return;
    io.to(`hospital:${hospitalId}`).emit(event, payload);
    logger.debug(`[ConnectionManager] Emitted ${event} to hospital:${hospitalId}`);
  }

  static sendToAmbulance(ambulanceId: string, event: string, payload: any) {
    const io = safeGetIO();
    if (!io) return;
    io.to(`ambulance:${ambulanceId}`).emit(event, payload);
    logger.debug(`[ConnectionManager] Emitted ${event} to ambulance:${ambulanceId}`);
  }

  static broadcastEmergency(emergency: any, matches: MatchResult[]) {
    matches.forEach((m) => {
      this.sendToHospital(m.hospital_id, "NEW_EMERGENCY", {
        type: "NEW_EMERGENCY",
        emergencyId: emergency.id,
        emergencyType: emergency.type,
        requirements: {
          icu: emergency.requiresIcu,
          ventilator: emergency.requiresVentilator,
          oxygen: emergency.requiresOxygen,
          cardiac: emergency.requiresCardiac,
          burns: emergency.requiresBurns,
        },
        distanceKm: m.distance_km,
        etaMinutes: m.eta_min,
        expiresAt: null,
      });
    });
  }

  static broadcastMatchUpdate(emergencyId: string, ambulanceId: string, matches: MatchResult[]) {
    this.sendToAmbulance(ambulanceId, "MATCHING_UPDATE", {
      type: "MATCHING_UPDATE",
      emergencyId,
      matches,
    });
  }

  static sendReservationUpdate(ambulanceId: string, reservation: any) {
    this.sendToAmbulance(ambulanceId, "RESERVATION_UPDATE", {
      type: "RESERVATION_UPDATE",
      reservation,
    });
  }
}
