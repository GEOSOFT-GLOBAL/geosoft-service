import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { createResponse } from "../../helpers/response";
import APIError from "../../helpers/api.error";
import { OtpToken } from "../../models/ng-tax/otp-token.model";
import { IOtpToken } from "../../interfaces/token";
import { sendOtpEmail } from "../../services/email.service";

/** Generates a random 6-digit numeric OTP code */
function generateOtpCode(): string {
  return crypto.randomInt(100_000, 999_999).toString();
}

/** OTP validity window in minutes */
const OTP_TTL_MINUTES = 10;

export class OtpController {
  /**
   * POST /ng-tax/otp/generate
   * Generates a new OTP for the authenticated user.
   * Body: { type: 'email_verification' | 'password_reset' }
   *
   * Any previously unused token of the same type for this user is invalidated
   * by marking it as used before issuing a new one.
   */
  public static async generate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = new Types.ObjectId(req.user!.id);
      const { type } = req.body as { type: IOtpToken["type"] };

      if (!type || !["email_verification", "password_reset"].includes(type)) {
        throw new APIError({
          message:
            "type is required and must be 'email_verification' or 'password_reset'",
          status: 400,
        });
      }

      // Invalidate any active (unused, non-expired) tokens of the same type
      await OtpToken.updateMany(
        { userId, type, usedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
        { $set: { usedAt: new Date() } },
      );

      const code = generateOtpCode();
      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

      const token = await OtpToken.create({ code, userId, type, expiresAt });

      // Send OTP via email (fire-and-forget; errors are logged but not surfaced to the caller)
      try {
        await sendOtpEmail(req.user!.email, code, type, OTP_TTL_MINUTES);
      } catch (emailError) {
        console.error("Failed to send OTP email:", emailError);
      }

      const isDev = process.env.NODE_ENV !== "production";

      res.status(201).json(
        createResponse({
          status: 201,
          success: true,
          message: "OTP sent to your email address",
          data: {
            tokenId: token._id,
            expiresAt: token.expiresAt,
            // Exposed only in non-production for testing convenience
            ...(isDev && { code }),
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /ng-tax/otp/verify
   * Verifies an OTP code for the authenticated user.
   * Body: { code: string, type: 'email_verification' | 'password_reset' }
   */
  public static async verify(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = new Types.ObjectId(req.user!.id);
      const { code, type } = req.body as { code: string; type: IOtpToken["type"] };

      if (!code || !type) {
        throw new APIError({
          message: "code and type are required",
          status: 400,
        });
      }

      if (!["email_verification", "password_reset"].includes(type)) {
        throw new APIError({
          message: "type must be 'email_verification' or 'password_reset'",
          status: 400,
        });
      }

      const token = await OtpToken.findOne({
        userId,
        type,
        code,
        usedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      });

      if (!token) {
        throw new APIError({
          message: "Invalid or expired OTP code",
          status: 400,
        });
      }

      // Mark token as used
      token.usedAt = new Date();
      await token.save();

      res.json(
        createResponse({
          status: 200,
          success: true,
          message: "OTP verified successfully",
          data: { tokenId: token._id, type: token.type },
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /ng-tax/otp/invalidate
   * Invalidates all active OTP tokens of a given type for the authenticated user.
   * Body: { type: 'email_verification' | 'password_reset' }
   */
  public static async invalidate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = new Types.ObjectId(req.user!.id);
      const { type } = req.body as { type: IOtpToken["type"] };

      if (!type || !["email_verification", "password_reset"].includes(type)) {
        throw new APIError({
          message:
            "type is required and must be 'email_verification' or 'password_reset'",
          status: 400,
        });
      }

      const result = await OtpToken.updateMany(
        { userId, type, usedAt: { $exists: false } },
        { $set: { usedAt: new Date() } },
      );

      res.json(
        createResponse({
          status: 200,
          success: true,
          message: "OTP tokens invalidated successfully",
          data: { invalidated: result.modifiedCount },
        }),
      );
    } catch (error) {
      next(error);
    }
  }
}
