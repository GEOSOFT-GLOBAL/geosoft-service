import { Document, Types } from "mongoose";
import { AppSource } from "./user";

/**
 * What an API key is allowed to do.
 *
 * Read and write are separated because the common SDK case — a site that
 * renders a timetable someone else maintains — needs neither the ability to
 * overwrite it nor a second account to hold it back.
 */
export enum ApiKeyScope {
  READ = "read",
  WRITE = "write",
}

export interface IApiKey {
  /** The user whose data this key acts on. */
  userId: Types.ObjectId;
  /** Human label, so a key can be revoked without guessing which one it is. */
  name: string;
  /** Public half, sent as `X-API-Key`. Safe to log and to show again later. */
  keyId: string;
  /**
   * SHA-256 of the secret half. The secret is 32 random bytes, so it needs no
   * key-stretching the way a chosen password does — and bcrypt on every
   * request would put ~100ms in front of each SDK call for nothing.
   */
  secretHash: string;
  /** Which app issued it; keys do not cross app boundaries. */
  appSource: AppSource;
  scopes: ApiKeyScope[];
  /** Set on revoke rather than deleting, so an audit trail survives. */
  revokedAt?: Date;
  /** Optional expiry; absent means the key lasts until revoked. */
  expiresAt?: Date;
  /**
   * Written at most once a minute rather than on every request — the value is
   * for "is this key still in use", which does not need second precision.
   */
  lastUsedAt?: Date;
}

export interface IApiKeyDocument extends IApiKey, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
