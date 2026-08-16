import HttpStatus from "http-status";
import { Types } from "mongoose";
import APIError from "../helpers/api.error";
import {
  CreditFeature,
  CreditOwnerType,
  CreditTransactionStatus,
  CreditTransactionType,
  ICreditAccountDocument,
  ICreditTransactionDocument,
} from "../interfaces/credits";
import { AppSource } from "../interfaces/user";
import { WorkspaceRole } from "../interfaces/workspace";
import { CreditAccount } from "../models/credit-account.model";
import { CreditTransaction } from "../models/credit-transaction.model";
import { Workspace } from "../models/workspace.model";
import { FEATURE_COSTS, FEATURE_LABELS, SIGNUP_GRANT } from "../config/credits";

/** Error code the client keys off to open the top-up flow. */
export const INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS";

const isDuplicateKey = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: number }).code === 11000;

export interface CreditOwner {
  ownerType: CreditOwnerType;
  ownerId: Types.ObjectId;
  appSource: AppSource;
}

/**
 * Decides whose balance is at stake.
 *
 * A workspace id is only honoured once membership is confirmed — otherwise
 * anyone could spend, or read, a workspace they merely know the id of. When
 * no workspace is given the user's own balance is used, which is what the
 * single-user modes always do.
 */
export const resolveOwner = async (
  userId: string,
  appSource: AppSource,
  workspaceId?: string,
): Promise<CreditOwner> => {
  if (!workspaceId) {
    return {
      ownerType: CreditOwnerType.USER,
      ownerId: new Types.ObjectId(userId),
      appSource,
    };
  }

  if (!Types.ObjectId.isValid(workspaceId)) {
    throw new APIError({
      message: "That workspace id is not valid.",
      status: HttpStatus.BAD_REQUEST,
      isPublic: true,
    });
  }

  const workspace = await Workspace.findOne({
    _id: workspaceId,
    "members.userId": userId,
  });

  if (!workspace) {
    throw new APIError({
      message: "You are not a member of that workspace.",
      status: HttpStatus.FORBIDDEN,
      isPublic: true,
    });
  }

  return {
    ownerType: CreditOwnerType.WORKSPACE,
    ownerId: workspace._id as Types.ObjectId,
    appSource,
  };
};

/** Only admins may buy on a workspace's behalf. */
export const assertCanPurchase = async (
  userId: string,
  owner: CreditOwner,
): Promise<void> => {
  if (owner.ownerType !== CreditOwnerType.WORKSPACE) return;

  const workspace = await Workspace.findById(owner.ownerId);
  const member = workspace?.members.find(
    (entry) => entry.userId.toString() === userId,
  );

  if (!workspace || member?.role !== WorkspaceRole.ADMIN) {
    throw new APIError({
      message: "Only a workspace admin can buy credits for the workspace.",
      status: HttpStatus.FORBIDDEN,
      isPublic: true,
    });
  }
};

/**
 * Fetches the owner's account, opening one — with the signup grant — the
 * first time it is asked for.
 */
export const getOrCreateAccount = async (
  owner: CreditOwner,
): Promise<ICreditAccountDocument> => {
  const existing = await CreditAccount.findOne(owner);
  if (existing) return existing;

  let account: ICreditAccountDocument;
  try {
    account = await CreditAccount.create({ ...owner, balance: 0 });
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    // Another request opened it first; theirs is as good as ours.
    const raced = await CreditAccount.findOne(owner);
    if (raced) return raced;
    throw error;
  }

  await creditAccount({
    account,
    amount: SIGNUP_GRANT,
    type: CreditTransactionType.GRANT,
    description: "Welcome credits",
    reference: `grant:signup:${account._id}`,
  });

  return (await CreditAccount.findById(account._id)) ?? account;
};

/**
 * Writes the ledger row for credits that are owed but not yet delivered —
 * a checkout that has been opened but not paid.
 *
 * Reserving under the payment reference before the money moves is what makes
 * fulfilment idempotent: a duplicate webhook, or a webhook racing the
 * client's own verify call, both land on this one row.
 */
export const reserveCredits = async ({
  account,
  amount,
  type,
  description,
  reference,
  actorId,
  metadata,
}: {
  account: ICreditAccountDocument;
  amount: number;
  type: CreditTransactionType;
  description: string;
  reference: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}): Promise<ICreditTransactionDocument> => {
  if (amount <= 0) {
    throw new APIError({
      message: "Credit amount must be positive.",
      status: HttpStatus.BAD_REQUEST,
    });
  }

  try {
    return await CreditTransaction.create({
      accountId: account._id,
      type,
      status: CreditTransactionStatus.PENDING,
      amount,
      description,
      reference,
      actorId: actorId ? new Types.ObjectId(actorId) : undefined,
      metadata,
    });
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    const existing = await CreditTransaction.findOne({ reference });
    if (!existing) throw error;
    return existing;
  }
};

/**
 * Moves a reserved row's credits into the balance.
 *
 * Returns `applied: false` when the row was already settled, which is the
 * normal outcome for the second of two deliveries and must not be treated as
 * an error.
 */
export const applyReservation = async (
  reference: string,
): Promise<{
  applied: boolean;
  transaction: ICreditTransactionDocument | null;
}> => {
  // Claiming the row with a conditional update means only one of two
  // simultaneous fulfilments can win, so the balance moves exactly once.
  const claimed = await CreditTransaction.findOneAndUpdate(
    { reference, status: CreditTransactionStatus.PENDING },
    { $set: { status: CreditTransactionStatus.APPLIED } },
    { new: true },
  );

  if (!claimed) {
    return {
      applied: false,
      transaction: await CreditTransaction.findOne({ reference }),
    };
  }

  const isPurchase =
    claimed.type === CreditTransactionType.PURCHASE ||
    claimed.type === CreditTransactionType.TOPUP;

  const updated = await CreditAccount.findByIdAndUpdate(
    claimed.accountId,
    {
      $inc: {
        balance: claimed.amount,
        ...(isPurchase ? { lifetimePurchased: claimed.amount } : {}),
      },
    },
    { new: true },
  );

  claimed.balanceAfter = updated?.balance;
  await claimed.save();

  return { applied: true, transaction: claimed };
};

/** Marks a checkout that was abandoned or declined, leaving the balance alone. */
export const failReservation = async (reference: string): Promise<void> => {
  await CreditTransaction.findOneAndUpdate(
    { reference, status: CreditTransactionStatus.PENDING },
    { $set: { status: CreditTransactionStatus.FAILED } },
  );
};

/** Credits that are owed and deliverable in one step — grants, adjustments. */
export const creditAccount = async (args: {
  account: ICreditAccountDocument;
  amount: number;
  type: CreditTransactionType;
  description: string;
  reference: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}): Promise<ICreditTransactionDocument | null> => {
  const reserved = await reserveCredits(args);
  if (reserved.status !== CreditTransactionStatus.PENDING) return reserved;
  const { transaction } = await applyReservation(args.reference);
  return transaction;
};

/**
 * Deducts credits for one use of a metered feature.
 *
 * The balance check and the decrement are a single conditional update, so two
 * concurrent requests cannot both pass a check against the same last credit.
 */
export const spendCredits = async ({
  owner,
  feature,
  quantity = 1,
  actorId,
  metadata,
}: {
  owner: CreditOwner;
  feature: CreditFeature;
  quantity?: number;
  actorId?: string;
  metadata?: Record<string, unknown>;
}): Promise<{
  balance: number;
  charged: number;
  transaction: ICreditTransactionDocument;
}> => {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new APIError({
      message: "Quantity must be a whole number of at least 1.",
      status: HttpStatus.BAD_REQUEST,
      isPublic: true,
    });
  }

  const account = await getOrCreateAccount(owner);
  const charged = FEATURE_COSTS[feature] * quantity;

  const debited = await CreditAccount.findOneAndUpdate(
    { _id: account._id, balance: { $gte: charged } },
    { $inc: { balance: -charged, lifetimeSpent: charged } },
    { new: true },
  );

  if (!debited) {
    const fresh = await CreditAccount.findById(account._id);
    throw new APIError({
      message: `Not enough credits. ${FEATURE_LABELS[feature]} costs ${charged}, and you have ${fresh?.balance ?? 0}.`,
      status: HttpStatus.PAYMENT_REQUIRED,
      isPublic: true,
      code: INSUFFICIENT_CREDITS,
      errorData: {
        required: charged,
        balance: fresh?.balance ?? 0,
        feature,
      },
    });
  }

  const transaction = await CreditTransaction.create({
    accountId: account._id,
    type: CreditTransactionType.SPEND,
    status: CreditTransactionStatus.APPLIED,
    amount: charged,
    balanceAfter: debited.balance,
    description:
      quantity > 1
        ? `${FEATURE_LABELS[feature]} × ${quantity}`
        : FEATURE_LABELS[feature],
    feature,
    actorId: actorId ? new Types.ObjectId(actorId) : undefined,
    metadata,
  });

  return { balance: debited.balance, charged, transaction };
};

/** How long after a charge the client may still void it. */
const VOID_WINDOW_MS = 15 * 60 * 1000;

/**
 * Puts a single spend back.
 *
 * AI scheduling and PDF export both run on the client, so a charge can be
 * taken for work that then fails on the user's machine. This exists so that
 * failure is refundable — and it is deliberately narrow, because a general
 * "add credits" endpoint reachable by a client would be a way to mint them:
 * it refunds one identified spend, of this owner's, once, and only shortly
 * after the fact.
 */
export const voidSpend = async ({
  owner,
  transactionId,
  actorId,
  reason,
}: {
  owner: CreditOwner;
  transactionId: string;
  actorId?: string;
  reason?: string;
}): Promise<{ balance: number; refunded: number }> => {
  const account = await getOrCreateAccount(owner);

  if (!Types.ObjectId.isValid(transactionId)) {
    throw new APIError({
      message: "That charge id is not valid.",
      status: HttpStatus.BAD_REQUEST,
      isPublic: true,
    });
  }

  const spend = await CreditTransaction.findOne({
    _id: transactionId,
    accountId: account._id,
    type: CreditTransactionType.SPEND,
    status: CreditTransactionStatus.APPLIED,
  });

  if (!spend) {
    throw new APIError({
      message: "That charge was not found on this account.",
      status: HttpStatus.NOT_FOUND,
      isPublic: true,
    });
  }

  if (Date.now() - spend.createdAt.getTime() > VOID_WINDOW_MS) {
    throw new APIError({
      message: "That charge is too old to be reversed automatically.",
      status: HttpStatus.CONFLICT,
      isPublic: true,
    });
  }

  // One refund per spend: the reference is derived from the spend's id, so a
  // second attempt collides on the unique index instead of paying out twice.
  const reference = `refund:${spend._id}`;
  const reserved = await reserveCredits({
    account,
    amount: spend.amount,
    type: CreditTransactionType.REFUND,
    description: reason || `Refund — ${spend.description}`,
    reference,
    actorId,
    metadata: { voids: spend._id.toString() },
  });

  if (reserved.status !== CreditTransactionStatus.PENDING) {
    const current = await CreditAccount.findById(account._id);
    return { balance: current?.balance ?? 0, refunded: 0 };
  }

  const { transaction } = await applyReservation(reference);

  // The spend no longer counts against lifetime usage.
  await CreditAccount.findByIdAndUpdate(account._id, {
    $inc: { lifetimeSpent: -spend.amount },
  });

  return {
    balance: transaction?.balanceAfter ?? 0,
    refunded: spend.amount,
  };
};

/**
 * The billing history. Pending rows are included so an unpaid checkout is
 * visible as pending rather than simply missing.
 */
export const listTransactions = async (
  account: ICreditAccountDocument,
  limit = 50,
): Promise<ICreditTransactionDocument[]> =>
  CreditTransaction.find({ accountId: account._id })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200));

export const CreditsService = {
  resolveOwner,
  assertCanPurchase,
  getOrCreateAccount,
  reserveCredits,
  applyReservation,
  failReservation,
  creditAccount,
  spendCredits,
  voidSpend,
  listTransactions,
};
