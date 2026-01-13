import { NextFunction, Request, Response } from "express";

/**
 * Global error handling middleware for Express.js.
 * @param {Error} err - The error object.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */

interface CustomError extends Error {
  status?: number;
  code?: string | number;
  errorData?: Record<string, unknown>;
}

function errorHandler(
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err.stack);

  let status = err.status || 500;
  let message = err.message || "Internal Server Error";

  if (err.name === "ValidationError") {
    status = 400;
    message = `Validation Error: ${err.message}`;
  } else if (err.name === "UnauthorizedError") {
    status = 401;
    message = `Unauthorized: ${err.message}`;
  } else if (err.name === "NotFoundError") {
    status = 404;
    message = `Not Found: ${err.message}`;
  } else if (err.name === "MongoError" && err.code === 11000) {
    status = 409;
    message = `Duplicate Key Error: ${err.message}`;
  }

  const response: Record<string, unknown> = {
    status,
    success: false,
    message,
    data: null,
  };

  // Include error code if present (for frontend handling)
  if (err.code && typeof err.code === "string") {
    response.code = err.code;
  }

  // Include error data if present
  if (err.errorData) {
    response.errorData = err.errorData;
  }

  res.status(status).json(response);
}

export default errorHandler;
