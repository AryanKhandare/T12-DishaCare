import { Router } from "express";
import { RouteController } from "../controllers/route.controller";

const router = Router();

// GET /api/routes?fromLat=..&fromLng=..&toLat=..&toLng=..
router.get("/", RouteController.getRoute);

export const routeRoutes = router;
