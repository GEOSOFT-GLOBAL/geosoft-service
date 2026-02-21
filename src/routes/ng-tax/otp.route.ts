import { Router } from "express";
import { OtpController } from "../../controllers/ng-tax/otp.controller";
import { authenticateUser } from "../../middlewares/auth.middleware";

const router = Router();

// All OTP routes require an authenticated user
router.use(authenticateUser);

router.post("/generate", OtpController.generate);
router.post("/verify", OtpController.verify);
router.delete("/invalidate", OtpController.invalidate);

export { router as NgTaxOtpRouter };
