import { Document } from "mongoose";

export enum AppSource {
  TIMETABLELY = "timetablely",
  DOCXIQ = "docxiq",
  LINKSHYFT = "linkshyft",
  TICKLY = "tickly",
  NGTAX = "ngtax",
}

export enum AuthProvider {
  LOCAL = "local",
  GOOGLE = "google",
  BOTH = "both",
}

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

export enum UserPlan {
  FREE = "free",
  PRO = "pro",
  ENTERPRISE = "enterprise",
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
  isEmailVerified?: boolean;
  authProvider?: AuthProvider;
  // Multi-app support
  appSource: AppSource;
  registeredApps?: AppSource[];
  isActive?: boolean;
  // AI credits & plan
  plan?: UserPlan;
  apiQuota?: number;
  usedQuota?: number;
  // Password reset
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

export interface IUserDocument extends IUser, Document {
  createdAt: Date;
  updatedAt: Date;
  comparePassword(userPassword: string): Promise<boolean>;
}
