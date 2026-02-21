import { Router } from "express";
import { NgTaxAuthController } from "../../controllers/ng-tax/auth.controller";
import { authenticateUser } from "../../middlewares/auth.middleware";

const router = Router();

// Local auth
router.post("/signup", NgTaxAuthController.signup);
router.post("/signin", NgTaxAuthController.signin);

// Google OAuth
router.get("/google", NgTaxAuthController.initGoogleAuth);
router.get("/google/callback", NgTaxAuthController.googleCallback);

// Password reset
router.post("/forgot-password", NgTaxAuthController.forgotPassword);
router.post("/reset-password", NgTaxAuthController.resetPassword);

// Email verification (requires authenticated user)
router.post("/verify-email", authenticateUser, NgTaxAuthController.verifyEmail);

export { router as NgTaxAuthRouter };
