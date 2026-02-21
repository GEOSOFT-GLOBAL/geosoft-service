import { model, Model, Schema } from "mongoose";
import { IOtpToken } from "../../interfaces/token";

const otpTokenSchema = new Schema<IOtpToken, Model<IOtpToken>>(
  {
    code: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    type: {
      type: String,
      enum: ["email_verification", "password_reset"],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpTokenSchema.index({ userId: 1, type: 1 });

export const OtpToken = model<IOtpToken>("otp_token", otpTokenSchema);
