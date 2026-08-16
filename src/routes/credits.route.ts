import { Router } from "express";
import { CreditsController } from "../controllers/credits.controller";
import { authenticateUser } from "../middlewares/auth.middleware";

const router = Router();

// Public: the pricing page reads the catalog before anyone signs in, and
// Paystack calls the webhook with its own signature rather than our token.
router.get("/catalog", CreditsController.catalog);
router.post("/webhook", CreditsController.webhook);

router.use(authenticateUser);

router.get("/balance", CreditsController.balance);
router.get("/transactions", CreditsController.transactions);
router.post("/spend", CreditsController.spend);
router.post("/void", CreditsController.voidCharge);
router.post("/checkout", CreditsController.checkout);
router.get("/verify/:reference", CreditsController.verify);

export { router as CreditsRouter };
