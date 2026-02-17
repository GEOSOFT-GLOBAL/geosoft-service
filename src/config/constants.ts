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
export const REDIRECT_URI = process.env.REDIRECT_URI || "";

export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

export const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;

// export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const DOCXIQ_GEMINI_API_KEY = process.env.DOCXIQ_GEMINI_API_KEY;
export const LINKSHYFT_GEMINI_API_KEY = process.env.LINKSHYFT_GEMINI_API_KEY;
export const TIMETABLELY_GEMINI_API_KEY = process.env.TIMETABLELY_GEMINI_API_KEY;