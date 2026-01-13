import { NextFunction, Request, Response } from "express";
import { oauth2Client } from "../services/google.service";
import { createResponse } from "../helpers/response";
import APIError from "../helpers/api.error";
import { google } from "googleapis";
import { User } from "../models/user.model";
import { AuthProvider, AppSource } from "../interfaces/user";
import { generateAccessToken } from "../services/jwt.service";

const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export class AuthController {
  public static async initGOAuth(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
      });
      res.json(
        createResponse({
          status: 200,
          success: true,
          message: "Auth URL generated",
          data: { authUrl },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  public static async GOCallback(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        throw new APIError({
          message: "Authorization code is required",
          status: 400,
        });
      }

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });

      const { data: googleUser } = await oauth2.userinfo.get();

      if (!googleUser.email || !googleUser.id) {
        throw new APIError({
          message: "Failed to get user info from Google",
          status: 400,
        });
      }

      const { appSource } = req.query;

      if (
        !appSource ||
        !Object.values(AppSource).includes(appSource as AppSource)
      ) {
        throw new APIError({
          message: "Valid appSource is required",
          status: 400,
        });
      }

      // Check if user exists by googleId or email
      let user = await User.findOne({
        $or: [{ googleId: googleUser.id }, { email: googleUser.email }],
      });

      if (user) {
        // Update existing user
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

        // Add app to registeredApps if not already present
        if (!user.registeredApps?.includes(appSource as AppSource)) {
          user.registeredApps = [
            ...(user.registeredApps || []),
            appSource as AppSource,
          ];
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
          appSource: appSource as AppSource,
          registeredApps: [appSource as AppSource],
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
          data: {
            user: {
              id: user._id,
              email: user.email,
              username: user.username,
              firstname: user.firstname,
              lastname: user.lastname,
              avatar: user.avatar,
              role: user.role,
              plan: user.plan,
            },
            accessToken,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  public static async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, username, firstname, lastname, appSource } =
        req.body;

      if (!email || !password || !username || !appSource) {
        throw new APIError({
          message: "Email, password, username, and appSource are required",
          status: 400,
        });
      }

      if (!Object.values(AppSource).includes(appSource)) {
        throw new APIError({
          message: "Valid appSource is required",
          status: 400,
        });
      }

      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        throw new APIError({
          message:
            existingUser.email === email
              ? "Email already in use"
              : "Username already taken",
          status: 409,
        });
      }

      const user = await new User({
        email,
        password,
        username,
        firstname,
        lastname,
        authProvider: AuthProvider.LOCAL,
        appSource,
        registeredApps: [appSource],
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
          message: "User registered successfully",
          data: {
            user: {
              id: user._id,
              email: user.email,
              username: user.username,
              firstname: user.firstname,
              lastname: user.lastname,
              role: user.role,
              plan: user.plan,
            },
            accessToken,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  public static async signin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new APIError({
          message: "Email and password are required",
          status: 400,
        });
      }

      const user = await User.findOne({ email });

      if (!user) {
        throw new APIError({
          message: "Invalid email or password",
          status: 401,
        });
      }

      if (!user.password) {
        throw new APIError({
          message: "Please sign in with Google",
          status: 400,
        });
      }

      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        throw new APIError({
          message: "Invalid email or password",
          status: 401,
        });
      }

      // Update last login
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
          data: {
            user: {
              id: user._id,
              email: user.email,
              username: user.username,
              firstname: user.firstname,
              lastname: user.lastname,
              avatar: user.avatar,
              role: user.role,
              plan: user.plan,
            },
            accessToken,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  public static async verifyAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = req.body;
      const user = await User.findOne({ userId }).orFail(() => {
        throw new APIError({ message: "User not found", status: 404 });
      });
      user.isEmailVerified = true;
      await user.save();
      res.status(200).json(
        createResponse({
          status: 200,
          success: true,
          message: "User verified successfully",
          data: user,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}
