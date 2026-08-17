import { randomBytes, createHash, timingSafeEqual } from "crypto";
import { model, Schema } from "mongoose";
import { ApiKeyScope, IApiKeyDocument } from "../interfaces/api-key";
import { AppSource } from "../interfaces/user";

/**
 * API keys: how a program reaches a user's timetable data.
 *
 * The app signs in a person and carries a JWT. An SDK embedded in someone
 * else's site has no person to sign in, so it presents a key pair instead.
 * Both end up as the same `req.user`, which is the point — one set of records,
 * two ways in, no second copy of the data to keep in step.
 */

/** Identifies the pair on sight, in a log or a support ticket. */
const KEY_ID_PREFIX = "ttly_key";
const SECRET_PREFIX = "ttly_sec";

export const hashSecret = (secret: string): string =>
  createHash("sha256").update(secret).digest("hex");

/**
 * Compares hashes without leaking, through timing, how much of the secret was
 * right. Lengths are fixed here, but the guard costs nothing and survives
 * someone later feeding this a value from elsewhere.
 */
export const secretMatches = (candidate: string, storedHash: string): boolean => {
  const candidateHash = Buffer.from(hashSecret(candidate), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (candidateHash.length !== stored.length) return false;
  return timingSafeEqual(candidateHash, stored);
};

/**
 * Mints a pair. The secret is returned once, here, and never again — only its
 * hash is stored, so a leaked database does not hand over working credentials.
 */
export const generateApiKeyPair = (): { keyId: string; secret: string } => ({
  keyId: `${KEY_ID_PREFIX}_${randomBytes(16).toString("hex")}`,
  secret: `${SECRET_PREFIX}_${randomBytes(32).toString("hex")}`,
});

const apiKeySchema = new Schema<IApiKeyDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    name: { type: String, required: true, trim: true },
    keyId: { type: String, required: true, unique: true, trim: true },
    secretHash: { type: String, required: true },
    appSource: {
      type: String,
      enum: Object.values(AppSource),
      required: true,
    },
    scopes: {
      type: [String],
      enum: Object.values(ApiKeyScope),
      default: [ApiKeyScope.READ],
    },
    revokedAt: { type: Date },
    expiresAt: { type: Date },
    lastUsedAt: { type: Date },
  },
  { timestamps: true },
);

// The lookup on every authenticated SDK request, and the one the settings
// screen makes when listing a user's keys.
apiKeySchema.index({ keyId: 1 });
apiKeySchema.index({ userId: 1, appSource: 1 });

export const ApiKey = model<IApiKeyDocument>("api_key", apiKeySchema);
