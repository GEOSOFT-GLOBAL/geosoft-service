import { NextFunction, Request, Response } from "express";
import HttpStatus from "http-status";
import APIError from "../helpers/api.error";
import { appSourceFrom } from "../helpers/app-source";
import { createResponse } from "../helpers/response";
import {
  CheckoutKind,
  CreditFeature,
  CreditTransactionStatus,
  CreditTransactionType,
  ICreditAccountDocument,
  ICreditTransactionDocument,
} from "../interfaces/credits";
import {
  CREDIT_PACKS,
  FEATURE_COSTS,
  FEATURE_LABELS,
  findPack,
  packTotalCredits,
  PLAN_CREDITS,
  PLAN_PRICES,
  PLAN_TO_USER_PLAN,
  PURCHASABLE_PLANS,
  SIGNUP_GRANT,
} from "../config/credits";
import {
  FRONTEND_URL,
  PAYSTACK_CURRENCY,
  PAYSTACK_PUBLIC_KEY,
} from "../config/constants";
import { CreditsService, CreditOwner } from "../services/credits.service";
import { PaystackService, toSubunits } from "../services/paystack.service";
import { User } from "../models/user.model";
import { CreditTransaction } from "../models/credit-transaction.model";

/**
 * Credits: balance, ledger, metered spending, and buying more.
 *
 * Prices and costs are never taken from the request. The client names a pack
 * or a plan; everything about what that costs and what it delivers is read
 * from the server catalog.
 */

const requireUser = (req: Request) => {
  if (!req.user) {
    throw new APIError({
      message: "Authentication required.",
      status: HttpStatus.UNAUTHORIZED,
    });
  }
  return req.user;
};

/** The workspace whose pool is in play, if the client named one. */
const ownerFor = async (req: Request): Promise<CreditOwner> => {
  const actor = requireUser(req);
  const workspaceId =
    (req.query.workspaceId as string | undefined) ||
    (req.body as { workspaceId?: string } | undefined)?.workspaceId;

  return CreditsService.resolveOwner(
    actor.id,
    appSourceFrom(req),
    workspaceId || undefined,
  );
};

const serialiseAccount = (
  account: ICreditAccountDocument,
  owner: CreditOwner,
) => ({
  balance: account.balance,
  lifetimePurchased: account.lifetimePurchased,
  lifetimeSpent: account.lifetimeSpent,
  ownerType: owner.ownerType,
  ownerId: owner.ownerId.toString(),
});

const serialiseTransaction = (transaction: ICreditTransactionDocument) => ({
  id: transaction._id.toString(),
  type: transaction.type,
  status: transaction.status,
  amount: transaction.amount,
  balanceAfter: transaction.balanceAfter,
  description: transaction.description,
  feature: transaction.feature,
  reference: transaction.reference,
  createdAt: transaction.createdAt.toISOString(),
  /** Money paid, present on purchases only. */
  price: (transaction.metadata as { price?: number } | undefined)?.price,
  currency: (transaction.metadata as { currency?: string } | undefined)
    ?.currency,
});

/**
 * Applies a paid reservation.
 *
 * Called from both the webhook and the client's verify call, which routinely
 * race each other; `applyReservation` settles that, and this only does the
 * plan side-effect for whichever call actually moved the credits.
 */
const fulfil = async (
  reference: string,
): Promise<{ applied: boolean; transaction: ICreditTransactionDocument | null }> => {
  const result = await CreditsService.applyReservation(reference);

  const metadata = result.transaction?.metadata as
    | { kind?: string; planId?: string; userId?: string }
    | undefined;

  if (result.applied && metadata?.kind === CheckoutKind.PLAN && metadata.planId) {
    const mapped = PLAN_TO_USER_PLAN[metadata.planId];
    if (mapped && metadata.userId) {
      await User.findByIdAndUpdate(metadata.userId, { plan: mapped });
    }
  }

  return result;
};

/**
 * Confirms the payment matches the reservation before any credit is given.
 *
 * Without the amount check, a charge for the smallest pack could be pointed
 * at a reservation for the largest one.
 */
const assertPaymentMatches = (
  reservation: ICreditTransactionDocument,
  payment: { status?: string; amount?: number; currency?: string },
): void => {
  if (payment.status !== "success") {
    throw new APIError({
      message: "That payment has not completed.",
      status: HttpStatus.PAYMENT_REQUIRED,
      isPublic: true,
      code: "PAYMENT_NOT_COMPLETED",
    });
  }

  const expected = (
    reservation.metadata as { amountSubunits?: number } | undefined
  )?.amountSubunits;

  if (expected !== undefined && payment.amount !== undefined && payment.amount < expected) {
    throw new APIError({
      message: "The amount paid does not match the order.",
      status: HttpStatus.BAD_REQUEST,
      isPublic: true,
      code: "PAYMENT_AMOUNT_MISMATCH",
    });
  }
};

export const CreditsController = {
  /**
   * GET /credits/catalog
   *
   * Public: the pricing page shows this before anyone signs in.
   */
  async catalog(_req: Request, res: Response, next: NextFunction) {
    try {
      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Credits catalog",
          data: {
            currency: PAYSTACK_CURRENCY,
            publicKey: PAYSTACK_PUBLIC_KEY || null,
            paymentsEnabled: PaystackService.isPaystackConfigured(),
            signupGrant: SIGNUP_GRANT,
            packs: CREDIT_PACKS.map((pack) => ({
              ...pack,
              totalCredits: packTotalCredits(pack),
            })),
            featureCosts: FEATURE_COSTS,
            featureLabels: FEATURE_LABELS,
            planCredits: PLAN_CREDITS,
            planPrices: PLAN_PRICES,
            purchasablePlans: PURCHASABLE_PLANS,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /** GET /credits/balance */
  async balance(req: Request, res: Response, next: NextFunction) {
    try {
      const owner = await ownerFor(req);
      const account = await CreditsService.getOrCreateAccount(owner);

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Balance retrieved",
          data: serialiseAccount(account, owner),
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /** GET /credits/transactions */
  async transactions(req: Request, res: Response, next: NextFunction) {
    try {
      const owner = await ownerFor(req);
      const account = await CreditsService.getOrCreateAccount(owner);
      const limit = Number(req.query.limit) || 50;

      const entries = await CreditsService.listTransactions(account, limit);

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Transactions retrieved",
          data: {
            ...serialiseAccount(account, owner),
            transactions: entries.map(serialiseTransaction),
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /credits/spend
   *
   * The metered features run in the browser, so the charge is taken here
   * before the client does the work, and can be reversed with /void if that
   * work then fails.
   */
  async spend(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireUser(req);
      const { feature, quantity } = req.body as {
        feature?: CreditFeature;
        quantity?: number;
      };

      if (!feature || !Object.values(CreditFeature).includes(feature)) {
        throw new APIError({
          message: "A known feature is required.",
          status: HttpStatus.BAD_REQUEST,
          isPublic: true,
        });
      }

      const owner = await ownerFor(req);
      const result = await CreditsService.spendCredits({
        owner,
        feature,
        quantity: quantity ?? 1,
        actorId: actor.id,
      });

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Credits charged",
          data: {
            balance: result.balance,
            charged: result.charged,
            transactionId: result.transaction._id.toString(),
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /** POST /credits/void — reverses one recent charge that did not deliver. */
  async voidCharge(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireUser(req);
      const { transactionId, reason } = req.body as {
        transactionId?: string;
        reason?: string;
      };

      if (!transactionId) {
        throw new APIError({
          message: "A charge id is required.",
          status: HttpStatus.BAD_REQUEST,
          isPublic: true,
        });
      }

      const owner = await ownerFor(req);
      const result = await CreditsService.voidSpend({
        owner,
        transactionId,
        actorId: actor.id,
        reason,
      });

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Charge reversed",
          data: result,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /credits/checkout
   *
   * Reserves the credits, then opens a Paystack transaction for them. The
   * reservation exists before the user ever reaches Paystack, so whichever
   * of the webhook or the return trip arrives first has something to settle.
   */
  async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireUser(req);
      const { kind, packId, planId } = req.body as {
        kind?: CheckoutKind;
        packId?: string;
        planId?: string;
      };

      const owner = await ownerFor(req);
      await CreditsService.assertCanPurchase(actor.id, owner);
      const account = await CreditsService.getOrCreateAccount(owner);

      let credits: number;
      let price: number;
      let description: string;
      let type: CreditTransactionType;

      if (kind === CheckoutKind.PACK) {
        const pack = findPack(packId || "");
        if (!pack) {
          throw new APIError({
            message: "That credit pack does not exist.",
            status: HttpStatus.BAD_REQUEST,
            isPublic: true,
          });
        }
        credits = packTotalCredits(pack);
        price = pack.price;
        description = `${pack.name} — ${credits} credits`;
        type = CreditTransactionType.TOPUP;
      } else if (kind === CheckoutKind.PLAN) {
        const wanted = planId || "";
        if (!PURCHASABLE_PLANS.includes(wanted as (typeof PURCHASABLE_PLANS)[number])) {
          throw new APIError({
            message: "That plan cannot be bought online. Contact sales.",
            status: HttpStatus.BAD_REQUEST,
            isPublic: true,
          });
        }
        credits = PLAN_CREDITS[wanted];
        price = PLAN_PRICES[wanted];
        description = `${wanted.charAt(0).toUpperCase()}${wanted.slice(1)} plan — ${credits} credits`;
        type = CreditTransactionType.PURCHASE;
      } else {
        throw new APIError({
          message: "Say whether you are buying a pack or a plan.",
          status: HttpStatus.BAD_REQUEST,
          isPublic: true,
        });
      }

      const reference = PaystackService.generateReference(
        kind === CheckoutKind.PLAN ? "plan" : "pack",
      );

      await CreditsService.reserveCredits({
        account,
        amount: credits,
        type,
        description,
        reference,
        actorId: actor.id,
        metadata: {
          kind,
          packId,
          planId,
          price,
          currency: PAYSTACK_CURRENCY,
          amountSubunits: toSubunits(price),
          userId: actor.id,
          workspaceId:
            owner.ownerType === "workspace" ? owner.ownerId.toString() : undefined,
        },
      });

      try {
        const paystack = await PaystackService.initializeTransaction({
          email: actor.email,
          price,
          reference,
          // Inside the app shell: the user is signed in, and the page has to
          // call /credits/verify with their token to settle the payment.
          callbackUrl: `${FRONTEND_URL}/app/billing/callback`,
          metadata: { kind, packId, planId, credits, userId: actor.id },
        });

        res.status(HttpStatus.OK).json(
          createResponse({
            status: HttpStatus.OK,
            success: true,
            message: "Checkout opened",
            data: {
              authorizationUrl: paystack.authorizationUrl,
              reference: paystack.reference,
              credits,
              price,
              currency: PAYSTACK_CURRENCY,
            },
          }),
        );
      } catch (error) {
        // Paystack never opened, so the reservation must not linger as an
        // unpaid row the user has to look at.
        await CreditsService.failReservation(reference);
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /credits/verify/:reference
   *
   * The client calls this when the user returns from Paystack. It asks
   * Paystack directly rather than trusting the redirect, which means credits
   * land immediately instead of whenever the webhook is delivered.
   */
  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireUser(req);
      const { reference } = req.params;

      const reservation = await CreditTransaction.findOne({ reference });
      if (!reservation) {
        throw new APIError({
          message: "That payment reference is not known.",
          status: HttpStatus.NOT_FOUND,
          isPublic: true,
        });
      }

      const buyerId = (reservation.metadata as { userId?: string } | undefined)
        ?.userId;
      if (buyerId && buyerId !== actor.id) {
        throw new APIError({
          message: "That payment belongs to another account.",
          status: HttpStatus.FORBIDDEN,
          isPublic: true,
        });
      }

      // Already settled by the webhook — say so rather than asking again.
      if (reservation.status === CreditTransactionStatus.APPLIED) {
        res.status(HttpStatus.OK).json(
          createResponse({
            status: HttpStatus.OK,
            success: true,
            message: "Payment already credited",
            data: {
              credited: false,
              credits: reservation.amount,
              balanceAfter: reservation.balanceAfter,
            },
          }),
        );
        return;
      }

      const payment = await PaystackService.verifyTransaction(reference);
      assertPaymentMatches(reservation, payment);

      const result = await fulfil(reference);

      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Payment confirmed",
          data: {
            credited: result.applied,
            credits: result.transaction?.amount ?? reservation.amount,
            balanceAfter: result.transaction?.balanceAfter,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /credits/webhook
   *
   * Unauthenticated by necessity — Paystack has no token of ours. The
   * signature over the raw body is the entire trust boundary, so nothing is
   * read out of the payload before it verifies.
   */
  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers["x-paystack-signature"];
      const valid = PaystackService.verifyWebhookSignature(
        req.rawBody,
        Array.isArray(signature) ? signature[0] : signature,
      );

      if (!valid) {
        res.status(HttpStatus.UNAUTHORIZED).json(
          createResponse({
            status: HttpStatus.UNAUTHORIZED,
            success: false,
            message: "Invalid signature",
          }),
        );
        return;
      }

      const { event, data } = req.body as {
        event?: string;
        data?: { reference?: string; status?: string; amount?: number };
      };

      const reference = data?.reference;

      if (reference) {
        if (event === "charge.success") {
          const reservation = await CreditTransaction.findOne({ reference });
          if (reservation) {
            assertPaymentMatches(reservation, {
              status: "success",
              amount: data?.amount,
            });
            await fulfil(reference);
          }
        } else if (event === "charge.failed") {
          await CreditsService.failReservation(reference);
        }
      }

      // Paystack retries anything that is not a 200, so acknowledge once the
      // work is done regardless of whether this delivery was the one that
      // moved the balance.
      res.status(HttpStatus.OK).json(
        createResponse({
          status: HttpStatus.OK,
          success: true,
          message: "Received",
        }),
      );
    } catch (error) {
      next(error);
    }
  },
};
