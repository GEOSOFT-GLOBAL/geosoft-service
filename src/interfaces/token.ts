import { ObjectId } from "mongoose";

export interface IOtpToken extends Document {
  code: string;
  userId: ObjectId;
  type: 'email_verification' | 'password_reset';
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}