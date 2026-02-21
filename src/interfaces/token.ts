import { Types } from "mongoose";

export interface IOtpToken extends Document {
  code: string;
  userId: Types.ObjectId;
  type: 'email_verification' | 'password_reset';
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}