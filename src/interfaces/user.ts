import { Document, Types } from "mongoose";

export enum AuthProvider {
  LOCAL = "local",
  GOOGLE = "google",
  BOTH = "both"
}

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

export interface IBookmark {
  contractId: Types.ObjectId;
  bookmarkedAt: Date;
}

export interface IArchivedContract {
  contractId: Types.ObjectId;
  archivedAt: Date;
}

export interface IUser {
  email: string;
  role?: UserRole;
  avatar?: string;
  username: string;
  lastLogin?: Date;
  lastname?: string;
  password?: string;
  googleId?: string;
  firstname?: string;
  bookmarks?: IBookmark[];
  isEmailVerified?: boolean;
  authProvider?: AuthProvider;
  archivedContracts?: IArchivedContract[];
}

export interface IUserDocument extends IUser, Document {
  createdAt: Date;
  updatedAt: Date;
  comparePassword(userPassword: string): Promise<boolean>;
}