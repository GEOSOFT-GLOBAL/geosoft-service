import { model, Schema } from "mongoose";
import {
  CreditFeature,
  CreditTransactionStatus,
  CreditTransactionType,
  ICreditTransactionDocument,
} from "../interfaces/credits";

const creditTransactionSchema = new Schema<ICreditTransactionDocument>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "credit_account",
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(CreditTransactionType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(CreditTransactionStatus),
      default: CreditTransactionStatus.PENDING,
    },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number },
    description: { type: String, required: true, trim: true },
    feature: { type: String, enum: Object.values(CreditFeature) },
    actorId: { type: Schema.Types.ObjectId, ref: "user" },
    reference: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

// The ledger is read newest-first for one account.
creditTransactionSchema.index({ accountId: 1, createdAt: -1 });

// The idempotency guarantee. Sparse because spends carry no payment
// reference, and a partial index would exclude them from uniqueness anyway.
creditTransactionSchema.index(
  { reference: 1 },
  { unique: true, sparse: true },
);

export const CreditTransaction = model<ICreditTransactionDocument>(
  "credit_transaction",
  creditTransactionSchema,
);
