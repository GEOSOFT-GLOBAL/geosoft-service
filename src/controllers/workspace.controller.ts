import { NextFunction, Request, Response } from "express";
import HttpStatus from "http-status";
import { Types } from "mongoose";
import APIError from "../helpers/api.error";
import { appSourceFrom } from "../helpers/app-source";
import { createResponse } from "../helpers/response";
import {
  IWorkspaceDocument,
  WorkspaceRole,
} from "../interfaces/workspace";
import { generateInviteCode, Workspace } from "../models/workspace.model";
import { User } from "../models/user.model";

/**
 * Workspaces: the shared container behind company mode, and the thing a
 * pooled credit balance belongs to.
 *
 * The wire shape below is the contract the client's workspace-api.ts already
 * declares, so nothing on that side has to change beyond pointing at the
 * server.
 */

const normaliseCode = (code: string): string =>
  code.trim().toUpperCase().replace(/[\s-]/g, "");

/** Mongo documents go out in the shape the client already models. */
const serialise = (workspace: IWorkspaceDocument) => ({
  id: workspace._id.toString(),
  name: workspace.name,
  inviteCode: workspace.inviteCode,
  ownerId: workspace.ownerId.toString(),
  createdAt: workspace.createdAt.toISOString(),
  members: workspace.members.map((member) => ({
    id: member.userId.toString(),
    name: member.name,
    email: member.email,
    role: member.role,
    joinedAt: member.joinedAt.toISOString(),
  })),
  invites: workspace.invites.map((invite) => ({
    code: invite.code,
    email: invite.email,
    role: invite.role,
    createdAt: invite.createdAt.toISOString(),
    acceptedAt: invite.acceptedAt?.toISOString(),
  })),
});

const requireUser = (req: Request) => {
  if (!req.user) {
    throw new APIError({
      message: "Authentication required.",
      status: HttpStatus.UNAUTHORIZED,
    });
  }
  return req.user;
};

/** Loads a workspace the caller administers, or explains why they cannot. */
const loadAsAdmin = async (
  workspaceId: string,
  userId: string,
): Promise<IWorkspaceDocument> => {
  if (!Types.ObjectId.isValid(workspaceId)) {
    throw new APIError({
      message: "That workspace id is not valid.",
      status: HttpStatus.BAD_REQUEST,
      isPublic: true,
    });
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new APIError({
      message: "Workspace not found.",
      status: HttpStatus.NOT_FOUND,
      isPublic: true,
    });
  }

  const member = workspace.members.find(
    (entry) => entry.userId.toString() === userId,
  );

  if (member?.role !== WorkspaceRole.ADMIN) {
    throw new APIError({
      message: "Only a workspace admin can do that.",
      status: HttpStatus.FORBIDDEN,
      isPublic: true,
    });
  }

  return workspace;
};

/** Retries on the vanishingly rare code collision rather than failing. */
const createWithUniqueCode = async (
  build: (code: string) => Record<string, unknown>,
  attempts = 5,
): Promise<IWorkspaceDocument> => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await Workspace.create(build(generateInviteCode()));
    } catch (error) {
      const isDuplicate =
        typeof error === "object" &&
        error !== null &&
        (error as { code?: number }).code === 11000;
      if (!isDuplicate || attempt === attempts - 1) throw error;
    }
  }
  throw new APIError({
    message: "Could not allocate an invite code. Please try again.",
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  });
};

export const WorkspaceController = {
  /** POST /workspaces */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireUser(req);
      const { name } = req.body as { name?: string };

      if (!name?.trim()) {
        throw new APIError({
          message: "Give the workspace a name.",
          status: HttpStatus.BAD_REQUEST,
          isPublic: true,
        });
      }

      const user = await User.findById(actor.id);

      const workspace = await createWithUniqueCode((code) => ({
        name: name.trim(),
        inviteCode: code,
        ownerId: new Types.ObjectId(actor.id),
        appSource: appSourceFrom(req),
        members: [
          {
            userId: new Types.ObjectId(actor.id),
            name:
              user?.firstname && user?.lastname
                ? `${user.firstname} ${user.lastname}`
                : actor.username,
            email: actor.email,
            role: WorkspaceRole.ADMIN,
            joinedAt: new Date(),
          },
        ],
        invites: [],
      }));

      res.status(HttpStatus.CREATED).json(
        createResponse({
          status: HttpStatus.CREATED,
          success: true,
          message: "Workspace created",
          data: serialise(workspace),
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /** GET /workspaces — every workspace the caller belongs to. */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireUser(req);

      const workspaces = await Workspace.find({
        "members.userId": actor.id,
        appSource: appSourceFrom(req),
      }).sort({ createdAt: 1 });

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Workspaces retrieved",
          data: workspaces.map(serialise),
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /workspaces/join
   *
   * Accepts the workspace's standing code or any unredeemed personal invite.
   * A personal invite also decides the role; the standing code cannot grant
   * more than plain membership.
   */
  async join(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireUser(req);
      const { code } = req.body as { code?: string };

      if (!code?.trim()) {
        throw new APIError({
          message: "Enter the invite code you were sent.",
          status: HttpStatus.BAD_REQUEST,
          isPublic: true,
        });
      }

      const wanted = normaliseCode(code);
      const workspace = await Workspace.findOne({
        $or: [{ inviteCode: wanted }, { "invites.code": wanted }],
      });

      if (!workspace) {
        throw new APIError({
          message: "That invite code was not recognised.",
          status: HttpStatus.NOT_FOUND,
          isPublic: true,
        });
      }

      const invite = workspace.invites.find(
        (entry) => entry.code === wanted && !entry.acceptedAt,
      );

      const already = workspace.members.some(
        (member) => member.userId.toString() === actor.id,
      );

      if (!already) {
        const user = await User.findById(actor.id);
        workspace.members.push({
          userId: new Types.ObjectId(actor.id),
          name:
            user?.firstname && user?.lastname
              ? `${user.firstname} ${user.lastname}`
              : actor.username,
          email: actor.email,
          role: invite?.role ?? WorkspaceRole.MEMBER,
          joinedAt: new Date(),
        });
      }

      if (invite) {
        invite.acceptedAt = new Date();
        invite.acceptedBy = new Types.ObjectId(actor.id);
      }

      await workspace.save();

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: already ? "Already a member" : "Joined workspace",
          data: serialise(workspace),
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /** POST /workspaces/:workspaceId/invites */
  async createInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireUser(req);
      const workspace = await loadAsAdmin(req.params.workspaceId, actor.id);
      const { email, role } = req.body as {
        email?: string;
        role?: WorkspaceRole;
      };

      const invite = {
        code: generateInviteCode(),
        email: email?.trim() || undefined,
        role:
          role && Object.values(WorkspaceRole).includes(role)
            ? role
            : WorkspaceRole.MEMBER,
        createdAt: new Date(),
      };

      workspace.invites.push(invite);
      await workspace.save();

      res.status(HttpStatus.CREATED).json(
        createResponse({
          status: HttpStatus.CREATED,
          success: true,
          message: "Invite created",
          data: {
            code: invite.code,
            email: invite.email,
            role: invite.role,
            createdAt: invite.createdAt.toISOString(),
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /** DELETE /workspaces/:workspaceId/invites/:code */
  async revokeInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireUser(req);
      const workspace = await loadAsAdmin(req.params.workspaceId, actor.id);
      const wanted = normaliseCode(req.params.code);

      workspace.invites = workspace.invites.filter(
        (invite) => invite.code !== wanted,
      );
      await workspace.save();

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Invite revoked",
          data: serialise(workspace),
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /** DELETE /workspaces/:workspaceId/members/:memberId */
  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireUser(req);
      const workspace = await loadAsAdmin(req.params.workspaceId, actor.id);
      const { memberId } = req.params;

      if (workspace.ownerId.toString() === memberId) {
        throw new APIError({
          message:
            "The workspace owner cannot be removed. Transfer ownership first.",
          status: HttpStatus.BAD_REQUEST,
          isPublic: true,
        });
      }

      workspace.members = workspace.members.filter(
        (member) => member.userId.toString() !== memberId,
      );
      await workspace.save();

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Member removed",
          data: serialise(workspace),
        }),
      );
    } catch (error) {
      next(error);
    }
  },
};

export { serialise as serialiseWorkspace };
