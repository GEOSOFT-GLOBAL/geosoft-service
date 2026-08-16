import { Router } from "express";
import { WorkspaceController } from "../controllers/workspace.controller";
import { authenticateUser } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateUser);

router.get("/", WorkspaceController.list);
router.post("/", WorkspaceController.create);
router.post("/join", WorkspaceController.join);

router.post("/:workspaceId/invites", WorkspaceController.createInvite);
router.delete("/:workspaceId/invites/:code", WorkspaceController.revokeInvite);
router.delete(
  "/:workspaceId/members/:memberId",
  WorkspaceController.removeMember,
);

export { router as WorkspaceRouter };
