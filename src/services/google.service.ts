import { google } from "googleapis";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  TIMETABLELY_GOOGLE_CLIENT_ID,
  TIMETABLELY_GOOGLE_CLIENT_SECRET,
  DOCXIQ_GOOGLE_CLIENT_ID,
  DOCXIQ_GOOGLE_CLIENT_SECRET,
  LINKSHYFT_GOOGLE_CLIENT_ID,
  LINKSHYFT_GOOGLE_CLIENT_SECRET,
  NGTAX_GOOGLE_CLIENT_ID,
  NGTAX_GOOGLE_CLIENT_SECRET,
  getRedirectUriByAppSource,
} from "../config/constants";
import { AppSource } from "../interfaces/user";

// Helper to get credentials by app source
const getCredentialsByAppSource = (appSource: string) => {
  switch (appSource) {
    case "timetablely":
      return { clientId: TIMETABLELY_GOOGLE_CLIENT_ID, clientSecret: TIMETABLELY_GOOGLE_CLIENT_SECRET };
    case "docxiq":
      return { clientId: DOCXIQ_GOOGLE_CLIENT_ID, clientSecret: DOCXIQ_GOOGLE_CLIENT_SECRET };
    case "linkshyft":
      return { clientId: LINKSHYFT_GOOGLE_CLIENT_ID, clientSecret: LINKSHYFT_GOOGLE_CLIENT_SECRET };
    case "ngtax":
      return { clientId: NGTAX_GOOGLE_CLIENT_ID, clientSecret: NGTAX_GOOGLE_CLIENT_SECRET };
    default:
      return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET };
  }
};

// Create a base OAuth2 client without redirect URI (will be set dynamically)
// Note: This uses default credentials and should only be used as a fallback if necessary
const baseOAuth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET
);

/**
 * Generate a random state parameter for CSRF protection
 * @returns Random state string
 */
export const generateState = (): string => {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
};

/**
 * Generate Google OAuth URL for a specific app
 * @param appSource - The application source (timetablely, docxiq, linkshyft)
 * @param scopes - Optional scopes, defaults to email and profile
 * @param state - Optional state parameter for CSRF protection
 * @returns Object containing authUrl and state
 */
export const generateAuthUrl = (
  appSource: AppSource,
  scopes?: string[],
  state?: string
): { authUrl: string; state: string } => {
  const redirectUri = getRedirectUriByAppSource(appSource);
  const { clientId, clientSecret } = getCredentialsByAppSource(appSource);
  const stateParam = state || generateState();

  // Create a new OAuth2 client instance with the specific redirect URI and credentials
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes || [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    prompt: "consent",
    state: stateParam,
  });

  return { authUrl, state: stateParam };
};

/**
 * Exchange authorization code for tokens with redirect URI validation
 * @param code - Authorization code from Google
 * @param redirectUri - The redirect URI used in the authorization request
 * @param appSource - The application source (optional but recommended to ensure correct credentials)
 * @returns Tokens from Google
 */
export const getToken = async (code: string, redirectUri: string, appSource?: string): Promise<any> => {
  // Validate that the redirect URI matches one of our allowed URIs
  const allowedRedirectUris = [
    getRedirectUriByAppSource("timetablely"),
    getRedirectUriByAppSource("docxiq"),
    getRedirectUriByAppSource("linkshyft"),
    getRedirectUriByAppSource("ngtax"),
  ];

  if (!allowedRedirectUris.includes(redirectUri)) {
    throw new Error(`Invalid redirect_uri: ${redirectUri}. Must be one of: ${allowedRedirectUris.join(", ")}`);
  }

  // Determine credentials - either by explicit appSource or infer from redirectUri
  let credentials;
  if (appSource) {
    credentials = getCredentialsByAppSource(appSource);
  } else {
    // Try to infer from redirectUri
    if (redirectUri === getRedirectUriByAppSource("timetablely")) credentials = getCredentialsByAppSource("timetablely");
    else if (redirectUri === getRedirectUriByAppSource("docxiq")) credentials = getCredentialsByAppSource("docxiq");
    else if (redirectUri === getRedirectUriByAppSource("linkshyft")) credentials = getCredentialsByAppSource("linkshyft");
    else if (redirectUri === getRedirectUriByAppSource("ngtax")) credentials = getCredentialsByAppSource("ngtax");
    else credentials = { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET };
  }

  // Create OAuth2 client with the validated redirect URI and correct credentials
  const oauth2Client = new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret,
    redirectUri
  );

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  return { tokens, oauth2Client };
};

/**
 * Get user info from Google using tokens
 * @param oauth2Client - Authenticated OAuth2 client
 * @returns Google user information
 */
export const getUserInfo = async (oauth2Client: any): Promise<any> => {
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data: googleUser } = await oauth2.userinfo.get();
  return googleUser;
};

// Export base client for backward compatibility (deprecated)
export const oauth2Client = baseOAuth2Client;
