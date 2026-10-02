import { Router } from "express";
import {
  ReservationController,
  createReservationSchema,
  rejectReservationSchema,
  releaseReservationSchema,
} from "../controllers/reservation.controller";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post(
  "/",
  requireAuth,
  validateBody(createReservationSchema),
  ReservationController.createReservation
);
router.get("/:id", requireAuth, ReservationController.getReservationById);
router.post("/:id/accept", requireAuth, ReservationController.acceptReservation);
router.post(
  "/:id/reject",
  requireAuth,
  validateBody(rejectReservationSchema),
  ReservationController.rejectReservation
);
router.post("/:id/expire", requireAuth, ReservationController.expireReservation);
router.post("/:id/arrived", requireAuth, ReservationController.arrived);
router.post(
  "/:id/release",
  requireAuth,
  validateBody(releaseReservationSchema),
  ReservationController.release
);

export const reservationRoutes = router;
