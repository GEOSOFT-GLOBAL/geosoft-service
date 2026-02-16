import { Router } from "express";
import { TimetableExportRouter } from "./timetable.export.route";

const router = Router();

router.use("/export", TimetableExportRouter);

export { router as TimetablelyRouter };
