import { config } from "dotenv";

config();

export const PORT = process.env.PORT || 4000;
export const BCRYPT_ROUND = process.env.BCRYPT_ROUND;
export const MONGO_URI = process.env.MONGO_URI || "";
export const JWT_SECRET = process.env.JWT_SECRET || "";
export const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";
export const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
export const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");
export const EMAIL_USER = process.env.EMAIL_USER as string;
export const EMAIL_PASS = process.env.EMAIL_PASS as string;
export const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER;
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
export const DATABASE_URL = process.env.DATABASE_URL as string;
export const MONGO_PROD_URI = process.env.MONGO_PROD_URI || "";
export const SESSION_SECRET = process.env.SESSION_SECRET as string;
export const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS as string);
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || [];

export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "";
export const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
export const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";
export const JWT_RESET_EXPIRY = process.env.JWT_RESET_EXPIRY || "1h";
export const JWT_VERIFICATION_EXPIRY = process.env.JWT_VERIFICATION_EXPIRY || "24h";

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

export const TIMETABLELY_GOOGLE_CLIENT_ID = process.env.TIMETABLELY_GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID;
export const TIMETABLELY_GOOGLE_CLIENT_SECRET = process.env.TIMETABLELY_GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET;

export const DOCXIQ_GOOGLE_CLIENT_ID = process.env.DOCXIQ_GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID;
export const DOCXIQ_GOOGLE_CLIENT_SECRET = process.env.DOCXIQ_GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET;

export const LINKSHYFT_GOOGLE_CLIENT_ID = process.env.LINKSHYFT_GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID;
export const LINKSHYFT_GOOGLE_CLIENT_SECRET = process.env.LINKSHYFT_GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET;

export const NGTAX_GOOGLE_CLIENT_ID = process.env.NGTAX_GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID;
export const NGTAX_GOOGLE_CLIENT_SECRET = process.env.NGTAX_GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET;

export const REDIRECT_URI = process.env.REDIRECT_URI || "";

// Multi-app redirect URIs
export const TIMETABLELY_REDIRECT_URI = process.env.TIMETABLELY_REDIRECT_URI || "http://localhost:5173/auth/google/callback";
export const DOCXIQ_REDIRECT_URI = process.env.DOCXIQ_REDIRECT_URI || "http://localhost:5174/auth/google/callback";
export const LINKSHYFT_REDIRECT_URI = process.env.LINKSHYFT_REDIRECT_URI || "http://localhost:5175/auth/google/callback";
export const NGTAX_REDIRECT_URI = process.env.NGTAX_REDIRECT_URI || "http://localhost:5176/auth/google/callback";

// Helper function to get redirect URI by appSource
export const getRedirectUriByAppSource = (appSource: string): string => {
  switch (appSource) {
    case "timetablely":
      return TIMETABLELY_REDIRECT_URI;
    case "docxiq":
      return DOCXIQ_REDIRECT_URI;
    case "linkshyft":
      return LINKSHYFT_REDIRECT_URI;
    case "ngtax":
      return NGTAX_REDIRECT_URI;
    default:
      return REDIRECT_URI; // Fallback to default
  }
};

export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

export const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;

// export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const DOCXIQ_GEMINI_API_KEY = process.env.DOCXIQ_GEMINI_API_KEY;
export const LINKSHYFT_GEMINI_API_KEY = process.env.LINKSHYFT_GEMINI_API_KEY;
export const TIMETABLELY_GEMINI_API_KEY = process.env.TIMETABLELY_GEMINI_API_KEY;