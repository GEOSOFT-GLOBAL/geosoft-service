import { NextFunction, Request, Response } from "express";
import HttpStatus from "http-status";
import APIError from "../helpers/api.error";
import { appSourceFrom } from "../helpers/app-source";
import { ApiKeyScope, IApiKeyDocument } from "../interfaces/api-key";
import { ApiKey, secretMatches } from "../models/api-key.model";
import { User } from "../models/user.model";
import { authenticateUser } from "./auth.middleware";

declare global {
  namespace Express {
    interface Request {
      /** Present only when the caller authenticated with a key pair. */
      apiKey?: {
        id: string;
        keyId: string;
        name: string;
        scopes: ApiKeyScope[];
      };
    }
  }
}

const API_KEY_HEADER = "x-api-key";
const API_SECRET_HEADER = "x-api-secret";

const headerValue = (req: Request, name: string): string | undefined => {
  const raw = req.headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
};

/** True when the caller is trying to use a key pair, well-formed or not. */
export const looksLikeApiKeyRequest = (req: Request): boolean =>
  Boolean(headerValue(req, API_KEY_HEADER));

/**
 * `lastUsedAt` answers "is anyone still using this key", so a write per
 * request would be pure cost. A minute of staleness is invisible in that
 * answer.
 */
const LAST_USED_RESOLUTION = 60 * 1000;

const touchLastUsed = (key: IApiKeyDocument): void => {
  const now = Date.now();
  if (key.lastUsedAt && now - key.lastUsedAt.getTime() < LAST_USED_RESOLUTION) {
    return;
  }
  // Deliberately not awaited: a bookkeeping write must not delay the response,
  // and losing one on a crash costs nothing.
  ApiKey.updateOne({ _id: key._id }, { $set: { lastUsedAt: new Date(now) } })
    .exec()
    .catch(() => {
      /* Bookkeeping only. */
    });
};

/**
 * The same rejection for a wrong key, a revoked key, and an expired key.
 *
 * Distinguishing them would tell an attacker holding a stale pair which half
 * they got right, and tells a legitimate integrator nothing they cannot get
 * from their own dashboard.
 */
const invalidCredentials = () =>
  new APIError({
    message: "Invalid API credentials.",
    status: HttpStatus.UNAUTHORIZED,
    isPublic: true,
    code: "INVALID_API_KEY",
  });

/**
 * Authenticates a request carrying `X-API-Key` and `X-API-Secret`.
 *
 * On success the request looks exactly like a signed-in one: `req.user` is the
 * key's owner, so every controller downstream keeps working unchanged.
 */
export const authenticateApiKey = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const keyId = headerValue(req, API_KEY_HEADER);
    const secret = headerValue(req, API_SECRET_HEADER);

    if (!keyId || !secret) {
      throw new APIError({
        message:
          "API key authentication requires both X-API-Key and X-API-Secret.",
        status: HttpStatus.UNAUTHORIZED,
        isPublic: true,
        code: "INVALID_API_KEY",
      });
    }

    const key = await ApiKey.findOne({ keyId });

    if (!key || key.revokedAt) throw invalidCredentials();
    if (key.expiresAt && key.expiresAt.getTime() <= Date.now()) {
      throw invalidCredentials();
    }
    if (!secretMatches(secret, key.secretHash)) throw invalidCredentials();

    // A key issued for one app must not read another app's data, even though
    // both live under the same user.
    if (key.appSource !== appSourceFrom(req, key.appSource)) {
      throw new APIError({
        message: "This API key is not valid for that application.",
        status: HttpStatus.FORBIDDEN,
        isPublic: true,
        code: "API_KEY_WRONG_APP",
      });
    }

    const user = await User.findById(key.userId);
    if (!user) throw invalidCredentials();

    req.user = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role || "user",
      avatar: user.avatar,
    };

    req.apiKey = {
      id: key._id.toString(),
      keyId: key.keyId,
      name: key.name,
      scopes: key.scopes,
    };

    touchLastUsed(key);

    next();
  } catch (error) {
    next(
      error instanceof APIError
        ? error
        : new APIError({
            message: "Authentication failed",
            status: HttpStatus.UNAUTHORIZED,
          }),
    );
  }
};

/**
 * Accepts either way in.
 *
 * The app sends a bearer token; the SDK sends a key pair. Which one arrived is
 * decided by the headers rather than by trying both, so a bad key reports
 * "invalid API credentials" instead of the misleading "authentication
 * required" a fallthrough would produce.
 */
export const authenticateUserOrApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (looksLikeApiKeyRequest(req)) {
    return authenticateApiKey(req, res, next);
  }
  return authenticateUser(req, res, next);
};

/**
 * Gates a route on a scope.
 *
 * A bearer token is a person acting on their own data and passes unchecked;
 * only key pairs carry scopes, because only they get handed to third parties.
 */
export const requireApiKeyScope =
  (scope: ApiKeyScope) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.apiKey) return next();

    if (!req.apiKey.scopes.includes(scope)) {
      return next(
        new APIError({
          message: `This API key does not have the "${scope}" scope.`,
          status: HttpStatus.FORBIDDEN,
          isPublic: true,
          code: "API_KEY_SCOPE_REQUIRED",
        }),
      );
    }

    next();
  };
