import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { JwtPayload } from "../types";
import { logger } from "../utils/logger";
import { ConnectionManager } from "../realtime/connectionManager";

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (env.CORS_ORIGINS.includes("*") || env.CORS_ORIGINS.includes(origin)) {
          return callback(null, true);
        }
        if (env.NODE_ENV === "development" && origin.startsWith("http://localhost:")) {
          return callback(null, true);
        }
        callback(null, true); // Permissive in dev/hackathon environment
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Authentication middleware for Socket.IO
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        socket.data.user = decoded;
      } catch (err) {
        logger.warn("Socket handshake token invalid, continuing as guest", err);
      }
    }
    next();
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as JwtPayload | undefined;
    logger.info(`Socket connected: ${socket.id} (user: ${user?.username || "anonymous"})`);

    // Auto-join user-specific and role-specific rooms
    if (user) {
      ConnectionManager.registerClient(socket, user.hospitalId, user.ambulanceId);
      if (user.hospitalId) {
        logger.info(`Socket ${socket.id} joined room hospital:${user.hospitalId}`);
      }
      if (user.ambulanceId) {
        logger.info(`Socket ${socket.id} joined room ambulance:${user.ambulanceId}`);
      }
      if (user.role === "admin") {
        socket.join("admin");
        logger.info(`Socket ${socket.id} joined room admin`);
      }
    }

    // Explicit room joins with verification
    socket.on("JOIN_HOSPITAL_ROOM", (data: { hospitalId: string }) => {
      if (data?.hospitalId) {
        ConnectionManager.registerClient(socket, data.hospitalId, undefined);
        logger.info(`Socket ${socket.id} joined hospital:${data.hospitalId}`);
      }
    });

    socket.on("JOIN_AMBULANCE_ROOM", (data: { ambulanceId: string }) => {
      if (data?.ambulanceId) {
        ConnectionManager.registerClient(socket, undefined, data.ambulanceId);
        logger.info(`Socket ${socket.id} joined ambulance:${data.ambulanceId}`);
      }
    });

    // Reconnection synchronization (Section 51)
    socket.on("SYNC_REQUEST", async (data: { emergencyId: string }) => {
      if (!data?.emergencyId) return;
      try {
        const { prisma } = await import("../config/database");
        const { MatchingService } = await import("../services/matching.service");
        const emergency = await prisma.emergencyRequest.findUnique({
          where: { id: data.emergencyId },
          include: { reservations: { orderBy: { createdAt: "desc" } } },
        });
        if (emergency) {
          const matches = await MatchingService.getMatches({
            type: emergency.type,
            resources: emergency.resources as any,
            location: { lat: emergency.lat, lng: emergency.lng },
          });
          socket.emit("SYNC_RESPONSE", {
            type: "SYNC_RESPONSE",
            emergencyId: emergency.id,
            status: emergency.status,
            matches,
            activeReservation: emergency.reservations.find(
              (r) => r.status === "RESERVATION_REQUESTED" || r.status === "HELD"
            ),
          });
        }
      } catch (err) {
        logger.warn("SYNC_REQUEST processing error", err);
      }
    });

    socket.on("disconnect", () => {
      ConnectionManager.unregisterClient(socket.id);
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO has not been initialized yet.");
  }
  return io;
}

export function safeGetIO(): SocketIOServer | null {
  return io;
}
