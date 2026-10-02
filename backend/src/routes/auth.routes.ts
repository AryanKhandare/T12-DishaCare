import { Router } from "express";
import {
  AuthController,
  loginSchema,
  signupSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/send-otp", validateBody(sendOtpSchema), AuthController.sendOtp);
router.post("/verify-otp", validateBody(verifyOtpSchema), AuthController.verifyOtp);
router.post("/signup", validateBody(signupSchema), AuthController.signup);
router.post("/login", validateBody(loginSchema), AuthController.login);
router.post("/logout", AuthController.logout);
router.get("/me", requireAuth, AuthController.me);

export const authRoutes = router;
