import crypto from 'crypto';

/**
 * Generates a cryptographically secure reset token
 * @returns A 64-character hex string (32 bytes)
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a token using SHA-256
 * @param token - The plain text token to hash
 * @returns The hashed token as a hex string
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verifies if a plain token matches a hashed token
 * @param token - The plain text token to verify
 * @param hash - The hashed token to compare against
 * @returns True if the token matches the hash, false otherwise
 */
export function verifyTokenHash(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
}
