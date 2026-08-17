import { Router } from "express";
import { ApiKeyController } from "../controllers/api-key.controller";
import { authenticateUser } from "../middlewares/auth.middleware";

const router = Router();

// Bearer token only. A key that could mint keys would outlive its own
// revocation.
router.use(authenticateUser);

router.get("/", ApiKeyController.list);
router.post("/", ApiKeyController.create);
router.delete("/:id", ApiKeyController.revoke);

export { router as ApiKeyRouter };
