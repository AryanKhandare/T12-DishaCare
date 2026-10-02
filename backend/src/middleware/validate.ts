import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { AppError } from "./errorHandler";

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        }));
        const message = issues.length > 0 ? issues[0].message : "Validation failed";
        return next(new AppError(message, 400, "VALIDATION_ERROR", issues));
      }
      next(err);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        }));
        return next(new AppError("Query validation failed", 400, "VALIDATION_ERROR", issues));
      }
      next(err);
    }
  };
}
