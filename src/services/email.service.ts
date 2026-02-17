import nodemailer, { Transporter } from "nodemailer";
import {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
  FRONTEND_URL,
} from "../config/constants";
import { AppSource } from "../interfaces/user";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create reusable transporter
let transporter: Transporter | null = null;

/**
 * Get or create email transporter
 * @returns {Transporter} - Nodemailer transporter instance
 */
const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465, // true for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }
  return transporter;
};

/**
 * Send email using nodemailer
 * @param {EmailOptions} options - Email options including to, subject, html, and optional text
 * @returns {Promise<void>}
 * @throws {Error} - Throws an error if email sending fails
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""), // Strip HTML tags for text version
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

/**
 * Get frontend URL based on app source
 * @param {AppSource} appSource - The app source (timetablely, docxiq, etc.)
 * @returns {string} - Frontend URL for the specific app
 */
const getFrontendUrl = (appSource: AppSource): string => {
  const urlMap: Record<AppSource, string> = {
    [AppSource.TIMETABLELY]: "https://www.timetablely.com",
    [AppSource.DOCXIQ]: "https://www.docxiq.com",
    [AppSource.LINKSHYFT]: "https://www.linkshyft.com",
    [AppSource.TICKLY]: "https://www.tickly.com",
  };

  return urlMap[appSource] || FRONTEND_URL;
};

/**
 * Send password reset email to user
 * @param {string} email - User's email address
 * @param {string} resetToken - Password reset token
 * @param {AppSource} appSource - The app source for correct frontend URL
 * @returns {Promise<void>}
 * @throws {Error} - Throws an error if email sending fails
 */
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  appSource: AppSource,
): Promise<void> => {
  const frontendUrl = getFrontendUrl(appSource);
  const resetUrl = `${frontendUrl}/#/auth/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px 40px; text-align: center;">
                  <h1 style="margin: 0; color: #333333; font-size: 24px; font-weight: 600;">Reset Your Password</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 0 40px 20px 40px;">
                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                    We received a request to reset your password. Click the button below to create a new password:
                  </p>
                </td>
              </tr>
              
              <!-- Button -->
              <tr>
                <td style="padding: 0 40px 30px 40px; text-align: center;">
                  <a href="${resetUrl}" style="display: inline-block; padding: 14px 40px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 600;">Reset Password</a>
                </td>
              </tr>
              
              <!-- Alternative Link -->
              <tr>
                <td style="padding: 0 40px 20px 40px;">
                  <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                    If the button doesn't work, copy and paste this link into your browser:
                  </p>
                  <p style="margin: 0; color: #007bff; font-size: 14px; word-break: break-all;">
                    <a href="${resetUrl}" style="color: #007bff; text-decoration: none;">${resetUrl}</a>
                  </p>
                </td>
              </tr>
              
              <!-- Expiration Notice -->
              <tr>
                <td style="padding: 20px 40px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.5;">
                    <strong>Important:</strong> This link will expire in 1 hour for security reasons.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 40px 40px 40px;">
                  <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px; line-height: 1.5;">
                    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                    For security reasons, please do not share this email with anyone.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
Reset Your Password

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

For security reasons, please do not share this email with anyone.
  `;

  await sendEmail({
    to: email,
    subject: "Reset Your Password",
    html,
    text,
  });
};
