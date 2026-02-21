import { Router } from "express";
import { TimetableSyncController } from "../../controllers/timetablely/timetable.sync.controller";
import { authenticateUser } from "../../middlewares/auth.middleware";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Sync timetable data (POST /sync)
router.post("/sync", TimetableSyncController.syncTimetable);

// Get all timetable data (GET /data)
router.get("/data", TimetableSyncController.getTimetableData);

// Get timetable by ID (GET /timetable/:id)
router.get("/timetable/:id", TimetableSyncController.getTimetableById);

// Delete timetable by ID (DELETE /timetable/:id)
router.delete("/timetable/:id", TimetableSyncController.deleteTimetable);

// Get all templates (GET /templates)
router.get("/templates", TimetableSyncController.getTemplates);

// Delete template by ID (DELETE /templates/:id)
router.delete("/templates/:id", TimetableSyncController.deleteTemplate);

// Get all tutors (GET /tutors)
router.get("/tutors", TimetableSyncController.getTutors);

// Delete tutor by ID (DELETE /tutors/:id)
router.delete("/tutors/:id", TimetableSyncController.deleteTutor);

// Get all courses (GET /courses)
router.get("/courses", TimetableSyncController.getCourses);

// Delete course by ID (DELETE /courses/:id)
router.delete("/courses/:id", TimetableSyncController.deleteCourse);

// Get all sessions (GET /sessions)
router.get("/sessions", TimetableSyncController.getSessions);

// Delete session by ID (DELETE /sessions/:id)
router.delete("/sessions/:id", TimetableSyncController.deleteSession);

// Get all special blocks (GET /special-blocks)
router.get("/special-blocks", TimetableSyncController.getSpecialBlocks);

// Delete special block by ID (DELETE /special-blocks/:id)
router.delete("/special-blocks/:id", TimetableSyncController.deleteSpecialBlock);

export { router as TimetableSyncRouter };
