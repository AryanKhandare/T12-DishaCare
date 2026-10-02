import express from "express";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/errorHandler";
import { authRoutes } from "./routes/auth.routes";
import { hospitalRoutes } from "./routes/hospital.routes";
import { emergencyRoutes } from "./routes/emergency.routes";
import { reservationRoutes } from "./routes/reservation.routes";
import { adminRoutes } from "./routes/admin.routes";
import { eventRoutes } from "./routes/event.routes";
import { routeRoutes } from "./routes/route.routes";
import { ambulanceRoutes } from "./routes/ambulance.routes";

export const app = express();

// Global middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    app: "BedLink-Backend",
    timestamp: new Date().toISOString(),
  });
});

// Mount modular routes
app.use("/api/auth", authRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/emergency-requests", emergencyRoutes);
app.use("/api/emergencies", emergencyRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/ai", adminRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/ambulances", ambulanceRoutes);

// Centralized error handling
app.use(errorHandler);
