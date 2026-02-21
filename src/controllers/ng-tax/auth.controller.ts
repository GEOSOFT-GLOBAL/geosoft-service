import { NextFunction, Request, Response } from "express";
import { createResponse } from "../../helpers/response";
import APIError from "../../helpers/api.error";
import { User } from "../../models/user.model";
import { AuthProvider, AppSource } from "../../interfaces/user";
import { generateAccessToken } from "../../services/jwt.service";
import { generateAuthUrl, getToken, getUserInfo } from "../../services/google.service";
import { generateResetToken, hashToken, verifyTokenHash } from "../../helpers/token.helper";
import { sendPasswordResetEmail } from "../../services/email.service";
import { getRedirectUriByAppSource } from "../../config/constants";

/** The fixed app source for all ng-tax auth operations */
const APP_SOURCE = AppSource.NGTAX;

/** Minimal user shape returned in auth responses */
const formatUser = (user: any) => ({
  id: user._id,
  email: user.email,
  username: user.username,
  firstname: user.firstname,
  lastname: user.lastname,
  avatar: user.avatar,
  role: user.role,
  plan: user.plan,
  isEmailVerified: user.isEmailVerified,
});

export class NgTaxAuthController {
  // ─── Local Auth ────────────────────────────────────────────────────────────

  /**
   * POST /ng-tax/auth/signup
   * Registers a new ng-tax user with email + password.
   */
  public static async signup(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { email, password, username, firstname, lastname } = req.body;

      if (!email || !password || !username) {
        throw new APIError({
          message: "email, password, and username are required",
          status: 400,
        });
      }

      // Check for duplicate email
      const existingByEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingByEmail) {
        throw new APIError({ message: "Email is already registered", status: 409 });
      }

      // Check for duplicate username
      const existingByUsername = await User.findOne({ username });
      if (existingByUsername) {
        throw new APIError({ message: "Username is already taken", status: 409 });
      }

      const user = await new User({
        email,
        password,
        username,
        firstname,
        lastname,
        authProvider: AuthProvider.LOCAL,
        appSource: APP_SOURCE,
        registeredApps: [APP_SOURCE],
      } as any).save();

      const accessToken = await generateAccessToken({
        user_id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
      });

      res.status(201).json(
        createResponse({
          status: 201,
          success: true,
          message: "Account created successfully",
          data: { user: formatUser(user), accessToken },
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /ng-tax/auth/signin
   * Authenticates an ng-tax user with email + password.
   */
  public static async signin(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new APIError({ message: "email and password are required", status: 400 });
      }

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        throw new APIError({ message: "Invalid email or password", status: 401 });
      }

      if (!user.password) {
        throw new APIError({
          message: "This account uses Google sign-in. Please sign in with Google.",
          status: 400,
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new APIError({ message: "Invalid email or password", status: 401 });
      }

      // Ensure the user is registered for ng-tax
      if (!user.registeredApps?.includes(APP_SOURCE)) {
        user.registeredApps = [...(user.registeredApps || []), APP_SOURCE];
      }

      user.lastLogin = new Date();
      await user.save();

      const accessToken = await generateAccessToken({
        user_id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
      });

      res.json(
        createResponse({
          status: 200,
          success: true,
          message: "Sign in successful",
          data: { user: formatUser(user), accessToken },
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  // ─── Google OAuth ───────────────────────────────────────────────────────────

  /**
   * GET /ng-tax/auth/google
   * Returns the Google OAuth authorization URL for ng-tax.
   */
  public static async initGoogleAuth(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { authUrl, state } = generateAuthUrl(APP_SOURCE);

      res.json(
        createResponse({
          status: 200,
          success: true,
          message: "Google auth URL generated",
          data: { authUrl, state },
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /ng-tax/auth/google/callback
   * Handles the Google OAuth callback for ng-tax.
   * Query params: { code: string }
   */
  public static async googleCallback(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        throw new APIError({ message: "Authorization code is required", status: 400 });
      }

      const redirectUri = getRedirectUriByAppSource(APP_SOURCE);
      const { oauth2Client } = await getToken(code, redirectUri, APP_SOURCE);
      const googleUser = await getUserInfo(oauth2Client);

      if (!googleUser.email || !googleUser.id) {
        throw new APIError({
          message: "Failed to retrieve user info from Google",
          status: 400,
        });
      }

      // Find or create user
      let user = await User.findOne({
        $or: [{ googleId: googleUser.id }, { email: googleUser.email }],
      });

      if (user) {
        // Link Google account if not already linked
        if (!user.googleId) {
          user.googleId = googleUser.id;
          user.authProvider =
            user.authProvider === AuthProvider.LOCAL
              ? AuthProvider.BOTH
              : AuthProvider.GOOGLE;
        }

        if (googleUser.picture && !user.avatar) {
          user.avatar = googleUser.picture;
        }

        // Register for ng-tax if not already
        if (!user.registeredApps?.includes(APP_SOURCE)) {
          user.registeredApps = [...(user.registeredApps || []), APP_SOURCE];
        }

        user.lastLogin = new Date();
        await user.save();
      } else {
        // Create new user
        const username =
          googleUser.email.split("@")[0] + "_" + Date.now().toString(36);

        user = await new User({
          email: googleUser.email,
          googleId: googleUser.id,
          firstname: googleUser.given_name,
          lastname: googleUser.family_name,
          avatar: googleUser.picture,
          username,
          authProvider: AuthProvider.GOOGLE,
          appSource: APP_SOURCE,
          registeredApps: [APP_SOURCE],
        } as any).save();
      }

      const accessToken = await generateAccessToken({
        user_id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
      });

      res.json(
        createResponse({
          status: 200,
          success: true,
          message: "Google authentication successful",
          data: { user: formatUser(user), accessToken },
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  // ─── Password Reset ─────────────────────────────────────────────────────────

  /**
   * POST /ng-tax/auth/forgot-password
   * Sends a password reset email to the user.
   * Body: { email: string }
   */
  public static async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        throw new APIError({ message: "A valid email is required", status: 400 });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new APIError({ message: "Invalid email format", status: 400 });
      }

      const user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        // Skip Google-only accounts
        if (user.authProvider === AuthProvider.GOOGLE && !user.password) {
          // Fall through to generic success — don't reveal account existence
        } else {
          const resetToken = generateResetToken();
          const hashedToken = hashToken(resetToken);
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

          user.resetPasswordToken = hashedToken;
          user.resetPasswordExpires = expiresAt;
          await user.save();

          try {
            await sendPasswordResetEmail(email, resetToken, APP_SOURCE);
          } catch (emailError) {
            console.error("Failed to send password reset email:", emailError);
          }
        }
      }

      // Always return generic success to prevent email enumeration
      res.json(
        createResponse({
          status: 200,
          success: true,
          message: "If an account exists with this email, a password reset link has been sent",
          data: null,
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /ng-tax/auth/reset-password
   * Resets the user's password using a valid reset token.
   * Body: { token: string, newPassword: string }
   */
  public static async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new APIError({ message: "token and newPassword are required", status: 400 });
      }

      if (newPassword.length < 8) {
        throw new APIError({
          message: "Password must be at least 8 characters",
          status: 400,
        });
      }

      // Find user with a non-expired reset token
      const user = await User.findOne({
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!user || !user.resetPasswordToken) {
        throw new APIError({ message: "Invalid or expired reset token", status: 400 });
      }

      const isValid = verifyTokenHash(token, user.resetPasswordToken);
      if (!isValid) {
        throw new APIError({ message: "Invalid or expired reset token", status: 400 });
      }

      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.json(
        createResponse({
          status: 200,
          success: true,
          message: "Password reset successfully",
          data: null,
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  // ─── Email Verification ─────────────────────────────────────────────────────

  /**
   * POST /ng-tax/auth/verify-email
   * Marks the authenticated user's email as verified.
   * Intended to be called after a successful OTP verification.
   */
  public static async verifyEmail(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await User.findById(req.user!.id).orFail(() =>
        new APIError({ message: "User not found", status: 404 }),
      );

      if (user.isEmailVerified) {
        res.json(
          createResponse({
            status: 200,
            success: true,
            message: "Email is already verified",
            data: null,
          }),
        );
        return;
      }

      user.isEmailVerified = true;
      await user.save();

      res.json(
        createResponse({
          status: 200,
          success: true,
          message: "Email verified successfully",
          data: null,
        }),
      );
    } catch (error) {
      next(error);
    }
  }
}
