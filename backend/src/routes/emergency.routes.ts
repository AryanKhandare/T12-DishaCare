import { Router } from "express";
import {
  EmergencyController,
  createEmergencySchema,
  recordResponseSchema,
} from "../controllers/emergency.controller";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", EmergencyController.listEmergencies);
router.post(
  "/",
  requireAuth,
  validateBody(createEmergencySchema),
  EmergencyController.createEmergency
);
router.get("/:id", EmergencyController.getEmergencyById);
router.post("/:id/rank", requireAuth, EmergencyController.rankMatches);
router.get("/:id/matches", EmergencyController.getMatches);
router.get("/:id/responses", requireAuth, EmergencyController.getResponses);
router.post(
  "/:id/responses",
  requireAuth,
  validateBody(recordResponseSchema),
  EmergencyController.recordResponse
);
router.get("/:id/explanation/:hospitalId", EmergencyController.getExplanation);
router.post("/:id/cancel", requireAuth, EmergencyController.cancelEmergency);

export const emergencyRoutes = router;
