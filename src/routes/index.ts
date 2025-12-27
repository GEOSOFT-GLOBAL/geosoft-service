import { Request, Response, Router } from "express";
import { createResponse } from "../helpers/response";

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

export { router as rootRouter };
