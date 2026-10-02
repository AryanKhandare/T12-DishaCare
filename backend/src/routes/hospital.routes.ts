import { Router } from "express";
import { HospitalController, patchAvailabilitySchema } from "../controllers/hospital.controller";
import { validateBody } from "../middleware/validate";
import { requireAuth, requireHospitalStaff } from "../middleware/auth";

const router = Router();

// ── Convenience /me endpoints (hospitalId derived from JWT) ──
router.get("/me", requireAuth, requireHospitalStaff, HospitalController.getMyHospital);
router.patch(
  "/me/availability",
  requireAuth,
  requireHospitalStaff,
  validateBody(patchAvailabilitySchema),
  HospitalController.patchMyAvailability
);
router.get("/me/emergencies", requireAuth, requireHospitalStaff, HospitalController.getMyEmergencies);
router.get("/me/events", requireAuth, requireHospitalStaff, HospitalController.getMyEvents);
router.get("/me/reservations", requireAuth, requireHospitalStaff, HospitalController.getMyReservations);

// ── Standard param-based endpoints ──
router.get("/nearby", HospitalController.getNearbyHospitals);
router.get("/", HospitalController.getHospitals);
router.get("/:hospitalId", HospitalController.getHospitalById);
router.get("/:hospitalId/availability", HospitalController.getAvailability);
router.patch(
  "/:hospitalId/availability",
  requireAuth,
  validateBody(patchAvailabilitySchema),
  HospitalController.patchAvailability
);
router.get("/:hospitalId/reservations", requireAuth, HospitalController.getReservations);

export const hospitalRoutes = router;
