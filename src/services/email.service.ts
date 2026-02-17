import nodemailer, { Transporter } from "nodemailer";
import {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
} from "../config/constants";

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
