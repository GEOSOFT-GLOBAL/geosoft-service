import {
  sign,
  verify,
  TokenExpiredError,
  JsonWebTokenError,
  type SignOptions,
} from "jsonwebtoken";
import APIError from "../helpers/api.error";
import { JWT_EXPIRY, JWT_SECRET } from "../config/constants";
import { TokenPayload, AccessTokenPayload } from "../interfaces/params";

// Default to 7 days if not set - convert to seconds for numeric expiry
const getExpirySeconds = (): number => {
  const expiry = JWT_EXPIRY || "7d";
  // Parse string like "7d", "24h", "60m" to seconds
  const match = expiry.match(/^(\d+)([dhms])$/);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case "d":
        return value * 24 * 60 * 60;
      case "h":
        return value * 60 * 60;
      case "m":
        return value * 60;
      case "s":
        return value;
    }
  }
  // Default to 7 days in seconds
  return 7 * 24 * 60 * 60;
};

const TOKEN_EXPIRY_SECONDS = getExpirySeconds();

/**
 * Function to sign token
 * @param {TokenPayload} payload - The JWT token to be signed
 * @returns {Promise<string>} - encoded token containing user ID
 * @throws {Error} - Throws an error if token is invalid or missing
 */
export const signToken = async (payload: TokenPayload): Promise<string> => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  const options: SignOptions = {
    expiresIn: TOKEN_EXPIRY_SECONDS,
  };

  return sign(payload, JWT_SECRET, options);
};

/**
 * Function to generate access token
 * @param {AccessTokenPayload} payload - The JWT token payload to be signed
 * @returns {Promise<string>} - encoded token containing user information
 * @throws {Error} - Throws an error if token signing fails or if JWT_SECRET is missing
 */
export const generateAccessToken = async (
  payload: AccessTokenPayload
): Promise<string> => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  const options: SignOptions = {
    expiresIn: TOKEN_EXPIRY_SECONDS,
  };

  return new Promise((resolve, reject) => {
    sign(payload, JWT_SECRET, options, (err, token) => {
      if (err) {
        reject(err);
      } else {
        if (!token) {
          reject(new Error("Token is invalid or missing"));
        } else {
          resolve(token);
        }
      }
    });
  });
};

/**
 * Function to sign reset token
 * @param {TokenPayload} payload - The JWT token to be signed
 * @returns {Promise<string>} - encoded token containing user ID
 * @throws {Error} - Throws an error if token is invalid or missing
 */
export const signResetToken = async (
  payload: TokenPayload
): Promise<string> => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  const options: SignOptions = {
    expiresIn: TOKEN_EXPIRY_SECONDS,
  };

  return sign(payload, JWT_SECRET, options);
};

/**
 * Function to verify email token and extract user ID
 * @param {string} token - The JWT token to be verified
 * @returns {Promise<TokenPayload>} - Decoded token containing user ID and email
 * @throws {Error} - Throws an error if token is invalid or missing
 */
export async function verifyEmailToken(token: string): Promise<TokenPayload> {
  try {
    if (!token) {
      throw new Error("Token is required");
    }

    const decoded = verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new Error("Token has expired");
    } else if (error instanceof JsonWebTokenError) {
      throw new Error(error?.message || "Invalid Token");
    } else {
      throw new Error("An error occurred while verifying the token");
    }
  }
}

/**
 * Function to verify reset token and extract email
 * @param {string} token - The JWT token to be verified
 * @returns {Promise<{ email: string }>} - Decoded token containing email
 * @throws {Error} - Throws an error if token is invalid or missing
 */
export async function verifyResetToken(
  token: string
): Promise<{ email: string }> {
  if (!token) {
    throw new Error("Token is required");
  }

  try {
    const decoded = verify(token, JWT_SECRET) as { email: string };

    if (!decoded.email) {
      throw new Error("Invalid token payload");
    }

    return decoded;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new Error("Token has expired");
    } else if (error instanceof JsonWebTokenError) {
      throw new APIError({ message: "Invalid token", status: 400 });
    } else {
      throw new Error("An error occurred while verifying the token");
    }
  }
}