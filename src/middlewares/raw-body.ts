import { Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      /** The untouched request bytes, kept only where a signature needs them. */
      rawBody?: Buffer;
    }
  }
}

/**
 * Hands the JSON body parser a copy of the raw bytes on the way past.
 *
 * Webhook signatures are computed over exactly what was sent; re-serialising
 * the parsed object produces a different digest — different key order,
 * different whitespace — and would reject every genuine delivery.
 */
export const captureRawBody = (
  req: Request,
  _res: Response,
  buf: Buffer,
): void => {
  if (buf?.length) req.rawBody = buf;
};
