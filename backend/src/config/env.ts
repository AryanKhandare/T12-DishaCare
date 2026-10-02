import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:Aryan@123@localhost:5432/bedlink?schema=public",
  JWT_SECRET: process.env.JWT_SECRET || "bedlink_jwt_super_secret_hackathon_2026_key",
  CORS_ORIGINS: (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:5173,http://localhost:8080")
    .split(",")
    .map((s) => s.trim()),
  TEST_MODE: process.env.TEST_MODE === "true",
  RESERVATION_TIMEOUT_SECONDS: parseInt(
    process.env.RESERVATION_TIMEOUT_SECONDS || "120",
    10
  ),
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@bedlink.com",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "change-this-password",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  OSRM_BASE_URL: process.env.OSRM_BASE_URL || "https://router.project-osrm.org",
  SEARCH_RADIUS_KM: parseFloat(process.env.SEARCH_RADIUS_KM || "25"),
  MATCHING_RADIUS_KM: parseFloat(process.env.MATCHING_RADIUS_KM || process.env.SEARCH_RADIUS_KM || "15"),
  DEFAULT_EMERGENCY_SPEED_KMPH: parseFloat(process.env.DEFAULT_EMERGENCY_SPEED_KMPH || "40"),
  SMS_PROVIDER: process.env.SMS_PROVIDER || "console",
  SMS_API_KEY: process.env.SMS_API_KEY || "",
  SMS_SENDER_ID: process.env.SMS_SENDER_ID || "BEDLNK",
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10),
  OTP_MAX_ATTEMPTS: parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10),
  OTP_DEV_MODE: process.env.OTP_DEV_MODE === "true" || process.env.NODE_ENV !== "production",
};
