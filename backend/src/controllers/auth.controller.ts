import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { OtpService } from "../services/otp.service";
import { z } from "zod";

export const sendOtpSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  otp: z.string().min(6, "OTP code must be 6 digits"),
});

export const signupSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must include uppercase, lowercase, and a number"),
  confirmPassword: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  hospital_id: z.union([z.string(), z.number()]).nullable().optional(),
  hospitalId: z.union([z.string(), z.number()]).nullable().optional(),
  otp: z.string().optional(),
});

export const loginSchema = z.object({
  username: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(1, "Password is required"),
});

export class AuthController {
  static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      const result = await OtpService.sendOtp(phone);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, otp } = req.body;
      const result = await OtpService.verifyOtp(phone, otp);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.signup(req.body);

      // Set HTTP-only secure cookie
      res.cookie("token", result.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60 * 1000,
      });

      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, phone, password } = req.body;
      const identifier = phone || email || username || "";
      const result = await AuthService.login(identifier, password);

      // Set HTTP-only secure cookie
      res.cookie("token", result.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60 * 1000,
      });

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie("token", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      return res.status(200).json({ ok: true, message: "Logged out successfully" });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Unauthorized",
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        });
      }
      const userId = req.user.sub || req.user.userId || req.user.id || "";
      const profile = await AuthService.getUserProfile(userId);
      return res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }
}
