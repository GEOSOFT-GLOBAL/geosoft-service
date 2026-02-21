import { Router } from "express";
import { TimetableExportRouter } from "./timetable.export.route";
import { TimetableSyncRouter } from "./timetable.sync.route";

const router = Router();

router.use("/export", TimetableExportRouter);
router.use("/sync", TimetableSyncRouter);

export { router as TimetablelyRouter };
