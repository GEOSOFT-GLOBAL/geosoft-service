import { Request } from "express";
import { AppSource } from "../interfaces/user";

/**
 * Which app a request came from.
 *
 * Every client already sends `X-App-Source`; body and query are accepted as
 * fallbacks so existing callers that pass it explicitly keep working. An
 * unrecognised value falls back rather than throwing — the header is a
 * routing hint, not an authorisation decision.
 */
export const appSourceFrom = (
  req: Request,
  fallback: AppSource = AppSource.TIMETABLELY,
): AppSource => {
  const candidate =
    req.headers["x-app-source"] ||
    (req.body as { appSource?: string } | undefined)?.appSource ||
    req.query.appSource;

  const value = Array.isArray(candidate) ? candidate[0] : candidate;

  return Object.values(AppSource).includes(value as AppSource)
    ? (value as AppSource)
    : fallback;
};
