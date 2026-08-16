import { model, Schema } from "mongoose";
import {
  IWorkspaceDocument,
  IWorkspaceInvite,
  IWorkspaceMember,
  WorkspaceRole,
} from "../interfaces/workspace";
import { AppSource } from "../interfaces/user";

/** Unambiguous alphabet: no O/0, no I/1. Codes get read aloud and retyped. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateInviteCode = (length = 8): string =>
  Array.from(
    { length },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join("");

const memberSchema = new Schema<IWorkspaceMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    role: {
      type: String,
      enum: Object.values(WorkspaceRole),
      default: WorkspaceRole.MEMBER,
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const inviteSchema = new Schema<IWorkspaceInvite>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    role: {
      type: String,
      enum: Object.values(WorkspaceRole),
      default: WorkspaceRole.MEMBER,
    },
    createdAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    acceptedBy: { type: Schema.Types.ObjectId, ref: "user" },
  },
  { _id: false },
);

const workspaceSchema = new Schema<IWorkspaceDocument>(
  {
    name: { type: String, required: true, trim: true },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    ownerId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    appSource: {
      type: String,
      enum: Object.values(AppSource),
      required: true,
    },
    members: { type: [memberSchema], default: [] },
    invites: { type: [inviteSchema], default: [] },
  },
  { timestamps: true },
);

// The two lookups that matter: "which workspaces am I in" and "whose code is
// this". Invite codes are matched alongside the standing code, so both are
// indexed.
workspaceSchema.index({ "members.userId": 1 });
workspaceSchema.index({ "invites.code": 1 });

export const Workspace = model<IWorkspaceDocument>(
  "workspace",
  workspaceSchema,
);
