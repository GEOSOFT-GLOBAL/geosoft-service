import { Request, Response, Router } from "express";
import { createResponse } from "../helpers/response";
import { AuthRouter } from "./auth.route";
import { AnalyticsRouter } from "./analytics.route";
import { AIRouter } from "./ai.route";

const router = Router();

router.get("/health-check", (_req: Request, res: Response) => {
  res.status(200).json(
    createResponse({
      status: 200,
      success: true,
      message: "geosoft service is up and running...",
    })
  );
});

router.use("/auth", AuthRouter);
router.use("/analytics", AnalyticsRouter);
router.use("/ai", AIRouter);

export { router as rootRouter };
