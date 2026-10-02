import { Router, Request, Response, NextFunction } from "express";
import { EventService } from "../services/event.service";

const router = Router();

router.get("/:requestId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestId } = req.params;
    const events = await EventService.getEventsForRequest(requestId);
    return res.status(200).json(events);
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const events = await EventService.getAllRecentEvents(limit);
    return res.status(200).json(events);
  } catch (err) {
    next(err);
  }
});

export const eventRoutes = router;
