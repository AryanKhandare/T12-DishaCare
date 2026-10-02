import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";
import { SmsService } from "./sms.service";

export function normalizePhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[\s\-\(\)]/g, "").trim();
  return cleaned;
}

export function isValidPhone(phone: string): boolean {
  const cleaned = normalizePhone(phone);
  // Matches +91XXXXXXXXXX, 9876543210, +1XXXXXXXXXX (8 to 15 digits)
  const phoneRegex = /^\+?[1-9]\d{7,14}$/;
  return phoneRegex.test(cleaned);
}

export function maskPhone(phone: string): string {
  const cleaned = normalizePhone(phone);
  if (cleaned.length <= 4) return cleaned;
  const last4 = cleaned.slice(-4);
  const prefix = cleaned.slice(0, Math.min(3, cleaned.length - 4));
  return `${prefix}${"*".repeat(cleaned.length - prefix.length - 4)}${last4}`;
}

export class OtpService {
  /**
   * Generates, stores, and sends a secure 6-digit OTP code to the requested phone number.
   * Enforces rate limiting, bcrypt hashing, and configurable expiry.
   */
  static async sendOtp(phoneRaw: string) {
    if (!phoneRaw || !phoneRaw.trim()) {
      throw new AppError("Phone number is required.", 400, "PHONE_REQUIRED");
    }

    const cleanPhone = normalizePhone(phoneRaw);
    if (!isValidPhone(cleanPhone)) {
      throw new AppError("Please provide a valid phone number (e.g. +919876543210).", 400, "INVALID_PHONE");
    }

    // 1. Resend restriction / cooldown: prevent spamming
    const latestRecent = await prisma.otpVerification.findFirst({
      where: {
        phone: cleanPhone,
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000), // within last 60 seconds
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (latestRecent) {
      const waitSeconds = Math.max(
        1,
        60 - Math.floor((Date.now() - latestRecent.createdAt.getTime()) / 1000)
      );
      throw new AppError(
        `Please wait ${waitSeconds}s before requesting a new verification code.`,
        429,
        "OTP_COOLDOWN"
      );
    }

    // 2. Generate cryptographically secure 6-digit OTP
    const otpNumber = crypto.randomInt(100000, 1000000);
    const rawOtp = otpNumber.toString();

    // 3. Hash OTP securely with bcrypt
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

    // 4. Save to PostgreSQL in OtpVerification table
    await prisma.otpVerification.create({
      data: {
        phone: cleanPhone,
        otpHash,
        expiresAt,
        attempts: 0,
        verified: false,
      },
    });

    // 5. Send via configured SMS Provider
    const smsResult = await SmsService.sendOtp(cleanPhone, rawOtp);
    if (!smsResult.success) {
      throw new AppError(
        smsResult.error || "Failed to send SMS OTP. Please try again.",
        500,
        "SMS_DELIVERY_FAILED"
      );
    }

    return {
      success: true,
      message: `Verification code sent to ${maskPhone(cleanPhone)}`,
      phone: cleanPhone,
      expiresAt: expiresAt.toISOString(),
      // Dev mode support only when explicitly permitted in non-production
      ...(env.OTP_DEV_MODE && env.NODE_ENV !== "production" ? { devOtp: rawOtp } : {}),
    };
  }

  /**
   * Verifies an OTP code against stored hash in PostgreSQL.
   * Checks expiration, attempt limits, prevents replay attacks.
   */
  static async verifyOtp(phoneRaw: string, otp: string) {
    if (!phoneRaw || !phoneRaw.trim()) {
      throw new AppError("Phone number is required.", 400, "PHONE_REQUIRED");
    }

    if (!otp || !otp.trim()) {
      throw new AppError("Verification code is required.", 400, "OTP_REQUIRED");
    }

    const cleanPhone = normalizePhone(phoneRaw);
    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      throw new AppError("Verification code must be 6 digits.", 400, "INVALID_OTP_FORMAT");
    }

    // Find latest active (unverified) OTP record for this phone
    const record = await prisma.otpVerification.findFirst({
      where: {
        phone: cleanPhone,
        verified: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      throw new AppError(
        "No active verification code found for this phone number. Please request a new code.",
        400,
        "OTP_NOT_FOUND"
      );
    }

    // Check expiration
    if (new Date() > record.expiresAt) {
      throw new AppError(
        "Verification code has expired. Please request a new code.",
        400,
        "OTP_EXPIRED"
      );
    }

    // Check attempt limit
    if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new AppError(
        "Maximum verification attempts exceeded. Please request a new code.",
        400,
        "MAX_ATTEMPTS_EXCEEDED"
      );
    }

    // Increment attempt counter atomically
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    // Verify bcrypt hash
    const isValid = await bcrypt.compare(cleanOtp, record.otpHash);
    if (!isValid) {
      const remaining = env.OTP_MAX_ATTEMPTS - (record.attempts + 1);
      throw new AppError(
        remaining > 0
          ? `Invalid verification code. ${remaining} attempt(s) remaining.`
          : "Invalid verification code. Maximum attempts exceeded. Please request a new code.",
        400,
        "INVALID_OTP"
      );
    }

    // Mark as verified
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "Phone number verified successfully",
      phone: cleanPhone,
    };
  }

  /**
   * Checks whether a phone number has been verified within a reasonable signup window (30 mins).
   */
  static async isPhoneVerified(phoneRaw: string): Promise<boolean> {
    const cleanPhone = normalizePhone(phoneRaw);
    const verified = await prisma.otpVerification.findFirst({
      where: {
        phone: cleanPhone,
        verified: true,
        verifiedAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000), // verified within last 30 minutes
        },
      },
      orderBy: { verifiedAt: "desc" },
    });

    return !!verified;
  }
}
