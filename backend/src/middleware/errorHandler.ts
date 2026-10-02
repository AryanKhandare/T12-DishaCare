import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST", details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  logger.error(`[${req.method}] ${req.path} error: ${err.message}`, err.stack);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Handle Prisma known errors
  if ("code" in err && typeof (err as { code: unknown }).code === "string") {
    const prismaErr = err as { code: string; meta?: unknown };
    if (prismaErr.code === "P2002") {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_ENTRY",
          message: "A record with this identifier or unique field already exists.",
          details: prismaErr.meta,
        },
      });
    }
    if (prismaErr.code === "P2025") {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Record not found.",
          details: prismaErr.meta,
        },
      });
    }
  }

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected internal server error occurred.",
    },
  });
}
