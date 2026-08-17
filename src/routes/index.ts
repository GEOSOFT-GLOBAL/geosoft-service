import { AIRouter } from "./ai.route";
import { DocxIQRouter } from "./docxiq";
import { AuthRouter } from "./auth.route";
import { Request, Response, Router } from "express";
import { AnalyticsRouter } from "./analytics.route";
import { TimetablelyRouter } from "./timetablely";
import { NgTaxRouter } from "./ng-tax";
import PagesRouter from "./pages.route";
import { CreditsRouter } from "./credits.route";
import { WorkspaceRouter } from "./workspace.route";
import { ApiKeyRouter } from "./api-key.route";
import { createResponse } from "../helpers/response";

const router = Router();

router.get("/health-check", (_req: Request, res: Response) => {
  res.status(200).json(
    createResponse({
      status: 200,
      success: true,
      message: "geosoft service is up and running...",
    }),
  );
});

router.use("/auth", AuthRouter);
router.use("/analytics", AnalyticsRouter);
router.use("/ai", AIRouter);
router.use("/docxiq", DocxIQRouter);
router.use("/timetablely", TimetablelyRouter);
router.use("/workspaces", WorkspaceRouter);
router.use("/credits", CreditsRouter);
router.use("/api-keys", ApiKeyRouter);
router.use("/ng-tax", NgTaxRouter);
router.use(PagesRouter);

export { router as rootRouter };
