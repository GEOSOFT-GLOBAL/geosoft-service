import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import HttpStatus from "http-status";
import APIError from "../helpers/api.error";
import {
  PAYSTACK_BASE_URL,
  PAYSTACK_CURRENCY,
  PAYSTACK_PRICE_MULTIPLIER,
  PAYSTACK_SECRET_KEY,
  PAYSTACK_SUBUNITS,
} from "../config/constants";

/**
 * Paystack transport.
 *
 * Two things here are load-bearing for correctness rather than convenience:
 * amounts are converted to integer subunits exactly once, and webhook
 * signatures are compared in constant time against the *raw* request body —
 * a re-serialised body produces a different digest and would reject every
 * legitimate delivery.
 */

export interface PaystackInitResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

export const isPaystackConfigured = (): boolean =>
  Boolean(PAYSTACK_SECRET_KEY);

const assertConfigured = (): void => {
  if (!PAYSTACK_SECRET_KEY) {
    throw new APIError({
      message:
        "Payments are not configured on this server. Set PAYSTACK_SECRET_KEY.",
      status: HttpStatus.SERVICE_UNAVAILABLE,
      isPublic: true,
      code: "PAYMENTS_UNCONFIGURED",
    });
  }
};

/** Catalog prices are major units; Paystack wants an integer of subunits. */
export const toSubunits = (price: number): number =>
  Math.round(price * PAYSTACK_PRICE_MULTIPLIER * PAYSTACK_SUBUNITS);

/** What the buyer will actually be charged, for display and for the ledger. */
export const chargedAmount = (price: number): number =>
  toSubunits(price) / PAYSTACK_SUBUNITS;

/** Our own reference, so we can reconcile before Paystack answers. */
export const generateReference = (prefix: string): string =>
  `${prefix}_${Date.now()}_${randomBytes(6).toString("hex")}`;

const request = async <T>(
  path: string,
  init?: RequestInit,
): Promise<PaystackEnvelope<T>> => {
  assertConfigured();

  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const body = (await response.json().catch(() => null)) as
    | PaystackEnvelope<T>
    | null;

  if (!response.ok || !body?.status) {
    throw new APIError({
      message: body?.message || "Paystack rejected the request.",
      status: HttpStatus.BAD_GATEWAY,
      isPublic: true,
      code: "PAYSTACK_ERROR",
    });
  }

  return body;
};

export const initializeTransaction = async ({
  email,
  price,
  reference,
  callbackUrl,
  metadata,
}: {
  email: string;
  /** Major units, e.g. 12 for $12.00. */
  price: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<PaystackInitResponse> => {
  const body = await request<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email,
      amount: toSubunits(price),
      currency: PAYSTACK_CURRENCY,
      reference,
      callback_url: callbackUrl,
      metadata,
    }),
  });

  return {
    authorizationUrl: body.data.authorization_url,
    accessCode: body.data.access_code,
    reference: body.data.reference,
  };
};

export interface PaystackTransaction {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paidAt?: string;
  metadata?: Record<string, unknown>;
  customer?: { email?: string };
}

export const verifyTransaction = async (
  reference: string,
): Promise<PaystackTransaction> => {
  const body = await request<PaystackTransaction>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  return body.data;
};

/**
 * Confirms a webhook really came from Paystack.
 *
 * `rawBody` must be the bytes as received. Constant-time comparison keeps the
 * check from leaking, byte by byte, what a valid signature looks like.
 */
export const verifyWebhookSignature = (
  rawBody: Buffer | undefined,
  signature: string | undefined,
): boolean => {
  if (!rawBody || !signature || !PAYSTACK_SECRET_KEY) return false;

  const expected = createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
};

export const PaystackService = {
  isPaystackConfigured,
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  generateReference,
  toSubunits,
  chargedAmount,
};
