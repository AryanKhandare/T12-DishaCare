import { prisma } from "../config/database";
import { EventType } from "../types";
import { logger } from "../utils/logger";

export interface CreateEventParams {
  emergencyId?: string | null;
  hospitalId?: string | null;
  reservationId?: string | null;
  actor: string;
  type: EventType;
  message: string;
  metadata?: Record<string, unknown> | null;
  ts?: number;
}

export class EventService {
  static async logEvent(params: CreateEventParams) {
    try {
      const ts = params.ts ?? Date.now();
      const event = await prisma.eventLog.create({
        data: {
          ts: BigInt(ts),
          requestId: params.emergencyId ?? null,
          hospitalId: params.hospitalId ?? null,
          reservationId: params.reservationId ?? null,
          actor: params.actor,
          type: params.type,
          message: params.message,
          metadata: (params.metadata ?? {}) as any,
        },
      });

      logger.info(`[EVENT] ${params.type}: ${params.message}`);
      return {
        id: event.id,
        ts: Number(event.ts),
        request_id: event.requestId ?? undefined,
        hospital_id: event.hospitalId ?? undefined,
        reservation_id: event.reservationId ?? undefined,
        actor: event.actor,
        type: event.type as EventType,
        message: event.message,
        meta: (event.metadata as any) ?? {},
      };
    } catch (err) {
      logger.error("Failed to persist event log", err);
      return null;
    }
  }

  static async getEventsForRequest(requestId: string) {
    const events = await prisma.eventLog.findMany({
      where: { requestId },
      orderBy: { ts: "asc" },
    });

    return events.map((e) => ({
      id: e.id,
      ts: Number(e.ts),
      request_id: e.requestId ?? undefined,
      hospital_id: e.hospitalId ?? undefined,
      reservation_id: e.reservationId ?? undefined,
      actor: e.actor,
      type: e.type as EventType,
      message: e.message,
      meta: (e.metadata as any) ?? {},
    }));
  }

  static async getAllRecentEvents(limit = 100) {
    const events = await prisma.eventLog.findMany({
      take: limit,
      orderBy: { ts: "desc" },
    });

    return events.map((e) => ({
      id: e.id,
      ts: Number(e.ts),
      request_id: e.requestId ?? undefined,
      hospital_id: e.hospitalId ?? undefined,
      reservation_id: e.reservationId ?? undefined,
      actor: e.actor,
      type: e.type as EventType,
      message: e.message,
      meta: (e.metadata as any) ?? {},
    }));
  }
}
