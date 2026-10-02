import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { JwtPayload, Role } from "../types";
import { AppError } from "./errorHandler";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { id?: string };
    }
  }
}

function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

export function normalizeRole(roleStr: string): string {
  const upper = (roleStr || "").toUpperCase().trim();
  if (upper === "DISPATCHER") return "DISPATCHER";
  if (upper === "HOSPITAL_NURSE" || upper === "HOSPITAL") return "HOSPITAL_NURSE";
  if (upper === "ADMIN") return "ADMIN";
  return upper;
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (token === "undefined" || token === "null" || token === "") {
    token = null;
  }

  if (!token) {
    token = parseCookie(req.headers.cookie, "token");
  }

  if (!token) {
    return next(new AppError("Authentication required: token missing", 401, "UNAUTHORIZED"));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const uid = decoded.sub || decoded.userId;
    req.user = {
      ...decoded,
      id: uid,
      userId: uid,
    };
    next();
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      return next(new AppError("Authentication token has expired", 401, "TOKEN_EXPIRED"));
    }
    return next(new AppError("Invalid or expired authentication token", 401, "INVALID_TOKEN"));
  }
}

export const requireAuth = authenticateToken;

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
    }

    const userRole = normalizeRole(req.user.role);
    const normalizedAllowed = allowedRoles.map(normalizeRole);

    if (userRole === "ADMIN" || normalizedAllowed.includes(userRole)) {
      return next();
    }

    return next(
      new AppError(
        `Access denied. Requires one of roles: ${allowedRoles.join(", ")}`,
        403,
        "FORBIDDEN"
      )
    );
  };
}

export const requireDispatcher = requireRole("DISPATCHER");
export const requireHospitalStaff = requireRole("HOSPITAL_NURSE");
export const requireNurse = requireRole("HOSPITAL_NURSE", "DISPATCHER");
export const requireAdmin = requireRole("ADMIN");
