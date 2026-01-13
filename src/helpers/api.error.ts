/**
 * @extends Error
 */

import httpStatus from "http-status";
import { HttpExceptionInterface } from "types/helpers";

class HttpException extends Error {
  status: number | null;
  isOperational: boolean;
  isPublic: boolean | undefined = false;
  errorData?: Record<string, any> | null = null;
  code?: string;

  constructor({
    stack,
    status,
    message,
    isPublic,
    errorData,
    code,
  }: HttpExceptionInterface & { code?: string }) {
    super(message);
    this.stack = stack;
    this.status = status;
    this.message = message;
    this.isPublic = isPublic;
    this.isOperational = true; // This is required since bluebird 4 doesn't append it anymore.
    this.errorData = errorData;
    this.code = code;
    this.name = this.constructor.name;
  }
}

/**
 * Class representing an API error.
 * @extends HttpException
 */

class APIError extends HttpException {
  /**
   * Creates an API error.
   * @param {string} message - Error message.
   * @param {object | null} errorData - Error details.
   * @param {string | undefined} stack - call stack trace for error.
   * @param {number} status - HTTP status code of error.
   * @param {boolean} isPublic - Whether the message should be visible to user or not.
   * @param {string} code - Error code for frontend handling.
   */

  constructor({
    stack,
    message,
    errorData,
    isPublic = false,
    status = httpStatus.INTERNAL_SERVER_ERROR,
    code,
  }: HttpExceptionInterface & { code?: string }) {
    super({
      stack,
      status,
      message,
      isPublic,
      errorData,
      code,
    });
  }
}

export default APIError;