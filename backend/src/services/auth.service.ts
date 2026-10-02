import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { JwtPayload, Role } from "../types";
import { AppError } from "../middleware/errorHandler";
import { EventService } from "./event.service";
import { OtpService, normalizePhone, isValidPhone } from "./otp.service";

export interface SignupInput {
  name: string;
  username?: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword?: string;
  role: string;
  hospital_id?: string | number | null;
  hospitalId?: string | number | null;
  otp?: string;
}

export class AuthService {
  /**
   * Register a new user account (Dispatcher or Hospital Nurse).
   * Enforces role, hospital validation, password complexity, email/phone uniqueness,
   * and phone OTP verification.
   */
  static async signup(input: SignupInput) {
    const { name, username: customUsername, email, phone, password, confirmPassword, role, hospital_id, hospitalId, otp } = input;

    if (!name || !name.trim()) {
      throw new AppError("Full name is required.", 400, "NAME_REQUIRED");
    }

    if (!email || !email.trim()) {
      throw new AppError("Email is required.", 400, "EMAIL_REQUIRED");
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new AppError("Please provide a valid email address.", 400, "INVALID_EMAIL");
    }

    // Phone & OTP validation
    let cleanPhone: string | null = null;
    let isPhoneVerified = false;

    if (phone && phone.trim()) {
      cleanPhone = normalizePhone(phone);
      if (!isValidPhone(cleanPhone)) {
        throw new AppError("Please provide a valid phone number (e.g. +919876543210).", 400, "INVALID_PHONE");
      }

      // Check if duplicate phone
      const existingPhone = await prisma.user.findFirst({
        where: { phone: cleanPhone },
      });
      if (existingPhone) {
        throw new AppError("An account with this phone number already exists.", 409, "PHONE_ALREADY_EXISTS");
      }

      // If OTP code passed directly in signup, verify it now
      if (otp && otp.trim()) {
        await OtpService.verifyOtp(cleanPhone, otp.trim());
        isPhoneVerified = true;
      } else {
        // Otherwise check if pre-verified in OTP verification table within 30 mins
        isPhoneVerified = await OtpService.isPhoneVerified(cleanPhone);
        if (!isPhoneVerified) {
          throw new AppError("Phone number must be verified with OTP before account creation.", 400, "PHONE_NOT_VERIFIED");
        }
      }
    }

    // Password validation: min 8 chars, 1 uppercase, 1 lowercase, 1 number
    if (confirmPassword !== undefined && password !== confirmPassword) {
      throw new AppError("Passwords do not match.", 400, "PASSWORD_MISMATCH");
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      throw new AppError(
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.",
        400,
        "WEAK_PASSWORD"
      );
    }

    // Check duplicate email
    const existing = await prisma.user.findFirst({
      where: { email: cleanEmail },
    });
    if (existing) {
      throw new AppError("An account with this email already exists.", 409, "EMAIL_ALREADY_EXISTS");
    }

    // Role validation
    const roleUpper = (role || "").trim().toUpperCase();
    if (roleUpper === "ADMIN") {
      throw new AppError("Public registration for ADMIN role is not permitted.", 400, "FORBIDDEN_ROLE");
    }

    if (
      roleUpper !== "DISPATCHER" &&
      roleUpper !== "HOSPITAL_NURSE" &&
      roleUpper !== "HOSPITAL"
    ) {
      throw new AppError(
        "Invalid role. Public signup only supports DISPATCHER and HOSPITAL_NURSE.",
        400,
        "INVALID_ROLE"
      );
    }

    const canonicalRole =
      roleUpper === "HOSPITAL_NURSE" || roleUpper === "HOSPITAL" ? "hospital" : "dispatcher";

    let assignedHospitalId: string | null = null;

    if (canonicalRole === "hospital") {
      const hospId = hospital_id ?? hospitalId;
      if (!hospId) {
        throw new AppError(
          "A valid active hospital is required for hospital nurse accounts.",
          400,
          "HOSPITAL_REQUIRED"
        );
      }

      const hospital = await prisma.hospital.findUnique({
        where: { id: String(hospId) },
      });

      if (!hospital || !hospital.active) {
        throw new AppError(
          "A valid active hospital is required for hospital nurse accounts.",
          400,
          "INVALID_ACTIVE_HOSPITAL"
        );
      }

      assignedHospitalId = hospital.id;
    }

    // Hash password securely with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Determine unique username
    let username = "";
    if (customUsername && customUsername.trim()) {
      const cleanCustomUsername = customUsername.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanCustomUsername)) {
        throw new AppError(
          "Username must be between 3 and 30 characters and contain only letters, numbers, and underscores.",
          400,
          "INVALID_USERNAME"
        );
      }
      const existingUser = await prisma.user.findFirst({
        where: {
          username: { equals: cleanCustomUsername, mode: "insensitive" },
        },
      });
      if (existingUser) {
        throw new AppError("An account with this username already exists.", 409, "USERNAME_ALREADY_EXISTS");
      }
      username = cleanCustomUsername;
    } else {
      // Generate unique username based on email
      let baseUsername = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || "user";
      username = baseUsername;
      let attempt = 1;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}_${Math.floor(Math.random() * 10000)}`;
        attempt++;
        if (attempt > 20) {
          username = `${baseUsername}_${Date.now()}`;
          break;
        }
      }
    }

    // Create user in PostgreSQL
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        username,
        email: cleanEmail,
        phone: cleanPhone,
        phoneVerified: isPhoneVerified,
        passwordHash,
        role: canonicalRole,
        hospitalId: assignedHospitalId,
        ambulanceId: canonicalRole === "dispatcher" ? "A12" : null,
        isActive: true,
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      userId: user.id,
      username: user.username,
      role: user.role as Role,
      hospitalId: user.hospitalId,
      ambulanceId: user.ambulanceId ?? undefined,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: (env.JWT_EXPIRES_IN || "24h") as any,
    });

    // Log the registration event
    await EventService.logEvent({
      actor: user.username,
      type: "LOGIN",
      message: `${user.name} created an account and signed in (${user.role})`,
    });

    const userObj = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      phone_verified: user.phoneVerified,
      role: user.role as Role,
      hospital_id: user.hospitalId,
      hospitalId: user.hospitalId,
      ambulance_id: user.ambulanceId ?? undefined,
    };

    return {
      message: "Account created successfully",
      access_token: token,
      user: userObj,
    };
  }

  static async login(usernameOrEmailOrPhone: string, passwordPlain: string) {
    const term = (usernameOrEmailOrPhone || "").trim().toLowerCase();

    if (!term || !passwordPlain) {
      throw new AppError("Email/phone/username and password are required.", 400, "MISSING_CREDENTIALS");
    }

    const cleanPhone = normalizePhone(term);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: term, mode: "insensitive" } },
          { email: { equals: term, mode: "insensitive" } },
          ...(cleanPhone ? [{ phone: cleanPhone }] : []),
        ],
      },
    });

    if (!user) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
      throw new AppError("Account is inactive. Please contact administrator.", 403, "ACCOUNT_INACTIVE");
    }

    const validPassword = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!validPassword) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    const payload: JwtPayload = {
      sub: user.id,
      userId: user.id,
      username: user.username,
      role: user.role as Role,
      hospitalId: user.hospitalId,
      ambulanceId: user.ambulanceId ?? undefined,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: (env.JWT_EXPIRES_IN || "24h") as any,
    });

    // Log the login event
    await EventService.logEvent({
      actor: user.username,
      type: "LOGIN",
      message: `${user.name} signed in (${user.role})`,
    });

    const userObj = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      phone_verified: user.phoneVerified,
      role: user.role as Role,
      hospital_id: user.hospitalId,
      hospitalId: user.hospitalId,
      ambulance_id: user.ambulanceId ?? undefined,
    };

    return {
      access_token: token,
      user: userObj,
    };
  }

  static async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        phoneVerified: true,
        role: true,
        hospitalId: true,
        ambulanceId: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const userObj = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      phone_verified: user.phoneVerified,
      role: user.role as Role,
      hospital_id: user.hospitalId,
      hospitalId: user.hospitalId,
      ambulance_id: user.ambulanceId ?? undefined,
    };

    return {
      ...userObj,
      user: userObj,
    };
  }
}
