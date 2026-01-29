import { Router } from "express";
import { generatePrompt, getAppInfo } from "../controllers/prompt.controller";

const router = Router();

router.post("/generate", generatePrompt);
router.get("/app/:appType", getAppInfo);

export { router as AIRouter };
