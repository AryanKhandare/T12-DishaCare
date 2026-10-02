import cors from "cors";
import { env } from "../config/env";

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    const allowed = env.CORS_ORIGINS;
    if (allowed.includes(origin)) {
      return callback(null, origin);
    }

    // Also allow localhost / 127.0.0.1 on any port in development
    if (
      env.NODE_ENV !== "production" &&
      (origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.startsWith("http://192.168."))
    ) {
      return callback(null, origin);
    }

    callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie"],
  exposedHeaders: ["Set-Cookie"],
});
