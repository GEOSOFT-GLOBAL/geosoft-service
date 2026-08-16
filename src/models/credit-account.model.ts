import { model, Schema } from "mongoose";
import {
  CreditOwnerType,
  ICreditAccountDocument,
} from "../interfaces/credits";
import { AppSource } from "../interfaces/user";

const creditAccountSchema = new Schema<ICreditAccountDocument>(
  {
    ownerType: {
      type: String,
      enum: Object.values(CreditOwnerType),
      required: true,
    },
    ownerId: { type: Schema.Types.ObjectId, required: true },
    appSource: {
      type: String,
      enum: Object.values(AppSource),
      required: true,
    },
    balance: { type: Number, default: 0, min: 0 },
    lifetimePurchased: { type: Number, default: 0, min: 0 },
    lifetimeSpent: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// One account per owner per app. The unique index is what lets get-or-create
// race safely: a losing insert is a duplicate-key error, not a second account.
creditAccountSchema.index(
  { ownerType: 1, ownerId: 1, appSource: 1 },
  { unique: true },
);

export const CreditAccount = model<ICreditAccountDocument>(
  "credit_account",
  creditAccountSchema,
);
