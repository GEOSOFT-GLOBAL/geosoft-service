import { Router } from "express";
import { TimetableSyncController } from "../../controllers/timetablely/timetable.sync.controller";
import {
  authenticateUserOrApiKey,
  requireApiKeyScope,
} from "../../middlewares/api-key.middleware";
import { ApiKeyScope } from "../../interfaces/api-key";

const router = Router();

/**
 * Two callers, one set of records: the app arrives with a bearer token, the
 * SDK with a key pair. Both resolve to the same user, so an integration reads
 * the timetable its owner is editing rather than a copy of it.
 */
router.use(authenticateUserOrApiKey);

// Anything that changes data needs the write scope; a read-only key issued to
// a third-party site can render a timetable but not rewrite it. Bearer tokens
// are unaffected — see requireApiKeyScope.
const requireWrite = requireApiKeyScope(ApiKeyScope.WRITE);

// Sync timetable data (POST /sync)
router.post("/sync", requireWrite, TimetableSyncController.syncTimetable);

// Get all timetable data (GET /data)
router.get("/data", TimetableSyncController.getTimetableData);

// Get timetable by ID (GET /timetable/:id)
router.get("/timetable/:id", TimetableSyncController.getTimetableById);

// Delete timetable by ID (DELETE /timetable/:id)
router.delete(
  "/timetable/:id",
  requireWrite,
  TimetableSyncController.deleteTimetable,
);

// Get all templates (GET /templates)
router.get("/templates", TimetableSyncController.getTemplates);

// Delete template by ID (DELETE /templates/:id)
router.delete(
  "/templates/:id",
  requireWrite,
  TimetableSyncController.deleteTemplate,
);

// Get all tutors (GET /tutors)
router.get("/tutors", TimetableSyncController.getTutors);

// Delete tutor by ID (DELETE /tutors/:id)
router.delete("/tutors/:id", requireWrite, TimetableSyncController.deleteTutor);

// Get all courses (GET /courses)
router.get("/courses", TimetableSyncController.getCourses);

// Delete course by ID (DELETE /courses/:id)
router.delete(
  "/courses/:id",
  requireWrite,
  TimetableSyncController.deleteCourse,
);

// Get all sessions (GET /sessions)
router.get("/sessions", TimetableSyncController.getSessions);

// Delete session by ID (DELETE /sessions/:id)
router.delete(
  "/sessions/:id",
  requireWrite,
  TimetableSyncController.deleteSession,
);

// Get all special blocks (GET /special-blocks)
router.get("/special-blocks", TimetableSyncController.getSpecialBlocks);

// Delete special block by ID (DELETE /special-blocks/:id)
router.delete(
  "/special-blocks/:id",
  requireWrite,
  TimetableSyncController.deleteSpecialBlock,
);

export { router as TimetableSyncRouter };
