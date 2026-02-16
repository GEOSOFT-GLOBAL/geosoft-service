import { Router } from "express";
import { TimetableExportController } from "../../controllers/timetablely/timetable.export.controller";

const router = Router();

// Export timetable(s) as PDF
router.post("/export-pdf", TimetableExportController.exportTimetablePDF);

// Export single timetable with custom options
router.post("/export-single", TimetableExportController.exportSingleTimetable);

// Batch export with individual options per timetable
router.post("/batch-export", TimetableExportController.batchExportTimetables);

export { router as TimetableExportRouter };
