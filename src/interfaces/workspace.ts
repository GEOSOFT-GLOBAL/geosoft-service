import { Document, Types } from "mongoose";
import { AppSource } from "./user";

/**
 * A workspace is the shared container a team's records — and its credit
 * balance — belong to. Single-user modes never create one; those users own
 * their credits directly.
 */

export enum WorkspaceRole {
  ADMIN = "admin",
  MEMBER = "member",
  VIEWER = "viewer",
}

export interface IWorkspaceMember {
  userId: Types.ObjectId;
  name: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface IWorkspaceInvite {
  code: string;
  email?: string;
  role: WorkspaceRole;
  createdAt: Date;
  acceptedAt?: Date;
  acceptedBy?: Types.ObjectId;
}

export interface IWorkspace {
  name: string;
  /** The standing code a colleague enters to join. */
  inviteCode: string;
  ownerId: Types.ObjectId;
  appSource: AppSource;
  members: IWorkspaceMember[];
  invites: IWorkspaceInvite[];
}

export interface IWorkspaceDocument extends IWorkspace, Document {
  createdAt: Date;
  updatedAt: Date;
}
