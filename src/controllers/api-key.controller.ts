import { NextFunction, Request, Response } from "express";
import HttpStatus from "http-status";
import { Types } from "mongoose";
import APIError from "../helpers/api.error";
import { appSourceFrom } from "../helpers/app-source";
import { createResponse } from "../helpers/response";
import { ApiKeyScope, IApiKeyDocument } from "../interfaces/api-key";
import { ApiKey, generateApiKeyPair, hashSecret } from "../models/api-key.model";

/**
 * API key management.
 *
 * These routes are bearer-token only on purpose: a key must not be able to
 * mint another key, or revoking the one that leaked would not contain
 * anything.
 */

/** How many live keys one user may hold per app. */
const MAX_ACTIVE_KEYS = 10;

/** The secret is absent here — it exists in exactly one response, ever. */
const serialise = (key: IApiKeyDocument) => ({
  id: key._id.toString(),
  name: key.name,
  keyId: key.keyId,
  appSource: key.appSource,
  scopes: key.scopes,
  createdAt: key.createdAt.toISOString(),
  lastUsedAt: key.lastUsedAt?.toISOString(),
  expiresAt: key.expiresAt?.toISOString(),
  revokedAt: key.revokedAt?.toISOString(),
});

const requireUser = (req: Request) => {
  if (!req.user) {
    throw new APIError({
      message: "Authentication required.",
      status: HttpStatus.UNAUTHORIZED,
    });
  }
  return req.user;
};

const parseScopes = (input: unknown): ApiKeyScope[] => {
  if (input === undefined) return [ApiKeyScope.READ];

  const values = Array.isArray(input) ? input : [input];
  const allowed = Object.values(ApiKeyScope);
  const scopes = values.filter((value): value is ApiKeyScope =>
    allowed.includes(value as ApiKeyScope),
  );

  if (scopes.length === 0) {
    throw new APIError({
      message: `Scopes must be some of: ${allowed.join(", ")}.`,
      status: HttpStatus.BAD_REQUEST,
      isPublic: true,
    });
  }

  return Array.from(new Set(scopes));
};

export class ApiKeyController {
  /**
   * Mints a key pair.
   *
   * The secret is in this response and nowhere else — the caller stores it or
   * makes a new key. Saying so in `message` is part of the contract, not
   * decoration.
   */
  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireUser(req);
      const { name, scopes, expiresAt } = req.body as {
        name?: string;
        scopes?: unknown;
        expiresAt?: string;
      };

      if (!name?.trim()) {
        throw new APIError({
          message: "A key needs a name so you can tell your keys apart.",
          status: HttpStatus.BAD_REQUEST,
          isPublic: true,
        });
      }

      const appSource = appSourceFrom(req);

      const activeCount = await ApiKey.countDocuments({
        userId: user.id,
        appSource,
        revokedAt: { $exists: false },
      });

      if (activeCount >= MAX_ACTIVE_KEYS) {
        throw new APIError({
          message: `You already have ${MAX_ACTIVE_KEYS} active API keys. Revoke one before creating another.`,
          status: HttpStatus.CONFLICT,
          isPublic: true,
          code: "API_KEY_LIMIT_REACHED",
        });
      }

      let expiry: Date | undefined;
      if (expiresAt) {
        expiry = new Date(expiresAt);
        if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
          throw new APIError({
            message: "An expiry date has to be a valid date in the future.",
            status: HttpStatus.BAD_REQUEST,
            isPublic: true,
          });
        }
      }

      const { keyId, secret } = generateApiKeyPair();

      const key = await ApiKey.create({
        userId: new Types.ObjectId(user.id),
        name: name.trim(),
        keyId,
        secretHash: hashSecret(secret),
        appSource,
        scopes: parseScopes(scopes),
        expiresAt: expiry,
      });

      res.status(HttpStatus.CREATED).json(
        createResponse({
          status: HttpStatus.CREATED,
          success: true,
          message:
            "API key created. Copy the secret now — it is not shown again.",
          data: { ...serialise(key), apiSecret: secret },
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  /** Every key the user holds for this app, revoked ones included. */
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireUser(req);

      const keys = await ApiKey.find({
        userId: user.id,
        appSource: appSourceFrom(req),
      }).sort({ createdAt: -1 });

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "API keys retrieved successfully",
          data: keys.map(serialise),
        }),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revokes a key.
   *
   * The record stays so a later "what was using this" has an answer; only its
   * ability to authenticate goes away.
   */
  public static async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireUser(req);
      const { id } = req.params;

      if (!Types.ObjectId.isValid(id)) {
        throw new APIError({
          message: "That API key id is not valid.",
          status: HttpStatus.BAD_REQUEST,
          isPublic: true,
        });
      }

      const key = await ApiKey.findOne({ _id: id, userId: user.id });

      if (!key) {
        throw new APIError({
          message: "API key not found.",
          status: HttpStatus.NOT_FOUND,
          isPublic: true,
        });
      }

      // Revoking twice is the same outcome as revoking once; re-stamping the
      // date would lose when it actually happened.
      if (!key.revokedAt) {
        key.revokedAt = new Date();
        await key.save();
      }

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "API key revoked successfully",
          data: serialise(key),
        }),
      );
    } catch (error) {
      next(error);
    }
  }
}
