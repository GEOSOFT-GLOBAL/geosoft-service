import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

const router = Router();

router.post("/signup", AuthController.signup);
router.post("/signin", AuthController.signin);
router.post("/forgot-password", AuthController.forgotPassword);

router.get("/google", AuthController.initGOAuth);
router.get("/google/callback", AuthController.GOCallback);

export { router as AuthRouter };
