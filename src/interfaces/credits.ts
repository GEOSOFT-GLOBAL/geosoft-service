import { Document, Types } from "mongoose";
import { AppSource } from "./user";

/**
 * Credits are a prepaid balance spent on metered features. They are held by a
 * workspace when the user is in one, and by the user otherwise — see
 * `resolveOwner` in the credits service, which is the only place that decides.
 */

export enum CreditOwnerType {
  USER = "user",
  WORKSPACE = "workspace",
}

export enum CreditTransactionType {
  /** Credits included with a plan the user bought. */
  PURCHASE = "purchase",
  /** Credits bought on their own, outside a plan. */
  TOPUP = "topup",
  /** Given rather than sold — the signup allowance, goodwill, promotions. */
  GRANT = "grant",
  SPEND = "spend",
  REFUND = "refund",
  ADJUSTMENT = "adjustment",
}

/**
 * A ledger row is written before the balance moves, so a replayed webhook
 * finds the existing row instead of crediting twice, and a crash between the
 * two steps leaves something to finish rather than a silent loss.
 */
export enum CreditTransactionStatus {
  PENDING = "pending",
  APPLIED = "applied",
  FAILED = "failed",
}

/** The metered features. Costs live in config/credits.ts. */
export enum CreditFeature {
  AI_SCHEDULE = "ai_schedule",
  PDF_EXPORT = "pdf_export",
}

export interface ICreditAccount {
  ownerType: CreditOwnerType;
  ownerId: Types.ObjectId;
  appSource: AppSource;
  balance: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
}

export interface ICreditAccountDocument extends ICreditAccount, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreditTransaction {
  accountId: Types.ObjectId;
  type: CreditTransactionType;
  status: CreditTransactionStatus;
  /** Always positive; `type` carries the direction. */
  amount: number;
  /** Balance once applied. Null while pending. */
  balanceAfter?: number;
  /** Human-readable line for the billing history. */
  description: string;
  feature?: CreditFeature;
  /** Who triggered it — a workspace balance is spent by individual members. */
  actorId?: Types.ObjectId;
  /**
   * The idempotency key. For purchases this is the payment reference, which
   * is what makes a duplicate webhook delivery harmless.
   */
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface ICreditTransactionDocument
  extends ICreditTransaction,
    Document {
  createdAt: Date;
  updatedAt: Date;
}

/** What the client is buying when it opens checkout. */
export enum CheckoutKind {
  PACK = "pack",
  PLAN = "plan",
}
