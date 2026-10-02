import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();

router.get("/metrics", requireAuth, requireAdmin, AdminController.getMetrics);
router.get("/stale", requireAuth, requireAdmin, AdminController.getStale);
router.get("/reservations", requireAuth, requireAdmin, AdminController.getReservations);
router.post("/explain", AdminController.explainMatch);

// Hospital management
router.post("/hospitals", requireAuth, requireAdmin, AdminController.createHospital);
router.patch("/hospitals/:hospitalId", requireAuth, requireAdmin, AdminController.updateHospital);
router.patch("/hospitals/:hospitalId/activate", requireAuth, requireAdmin, AdminController.toggleHospitalActive);

// User management
router.get("/users", requireAuth, requireAdmin, AdminController.listUsers);
router.post("/users", requireAuth, requireAdmin, AdminController.createUser);
router.patch("/users/:userId/active", requireAuth, requireAdmin, AdminController.toggleUserActive);

export const adminRoutes = router;
