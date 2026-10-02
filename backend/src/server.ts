import http from "http";
import { app } from "./app";
import { env } from "./config/env";
import { initSocketIO } from "./sockets/socket";
import { logger } from "./utils/logger";
import { ReservationService } from "./services/reservation.service";
import { prisma } from "./config/database";

const server = http.createServer(app);

// Initialize Socket.IO
initSocketIO(server);

// Start background reservation expiration timer
const EXPIRATION_CHECK_INTERVAL_MS = 1000;
const expirationInterval = setInterval(() => {
  ReservationService.checkExpiredReservations();
}, EXPIRATION_CHECK_INTERVAL_MS);

// Start listening
server.listen(env.PORT, () => {
  logger.info(`🚑 BedLink Express Backend is running on port ${env.PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}, Test Mode: ${env.TEST_MODE}`);
  logger.info(`Reservation Hold Timeout: ${env.RESERVATION_TIMEOUT_SECONDS}s`);
  logger.info(`Allowed CORS Origins: ${env.CORS_ORIGINS.join(", ")}`);
});

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  clearInterval(expirationInterval);

  server.close(async () => {
    logger.info("HTTP and WebSocket server closed.");
    await prisma.$disconnect();
    logger.info("Database connection closed.");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export { server };
