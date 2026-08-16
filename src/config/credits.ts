import { CreditFeature } from "../interfaces/credits";
import { UserPlan } from "../interfaces/user";

/**
 * The credits catalog: what features cost, what plans include, and what a
 * top-up buys.
 *
 * This is the server's source of truth. The client fetches it from
 * `GET /credits/catalog` rather than holding its own copy, so a price change
 * here does not need a frontend deploy — and, more importantly, so a client
 * cannot bargain over what something costs.
 */

/** Credits deducted per use of a metered feature. */
export const FEATURE_COSTS: Record<CreditFeature, number> = {
  [CreditFeature.AI_SCHEDULE]: 5,
  [CreditFeature.PDF_EXPORT]: 1,
};

export const FEATURE_LABELS: Record<CreditFeature, string> = {
  [CreditFeature.AI_SCHEDULE]: "AI-assisted scheduling",
  [CreditFeature.PDF_EXPORT]: "PDF export",
};

/** Given once when an account is first opened, so the app is usable at all. */
export const SIGNUP_GRANT = 25;

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  /** Extra credits thrown in — the reason larger packs are worth buying. */
  bonusCredits: number;
  /** Major currency units, e.g. 10 = $10.00. */
  price: number;
  description: string;
  isPopular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "pack-small",
    name: "Small top-up",
    credits: 100,
    bonusCredits: 0,
    price: 5,
    description: "About 20 AI schedules or 100 exports.",
  },
  {
    id: "pack-medium",
    name: "Medium top-up",
    credits: 250,
    bonusCredits: 25,
    price: 12,
    description: "A term's worth of scheduling for one department.",
    isPopular: true,
  },
  {
    id: "pack-large",
    name: "Large top-up",
    credits: 600,
    bonusCredits: 100,
    price: 25,
    description: "For institutions regenerating schedules often.",
  },
  {
    id: "pack-bulk",
    name: "Bulk top-up",
    credits: 1500,
    bonusCredits: 400,
    price: 55,
    description: "Best rate per credit, for multi-campus rollouts.",
  },
];

/** Credits included when a plan is bought, and again on each renewal. */
export const PLAN_CREDITS: Record<string, number> = {
  starter: 25,
  basic: 300,
  pro: 1000,
  enterprise: 3000,
};

/** Monthly price per plan, in major currency units. Mirrors the pricing page. */
export const PLAN_PRICES: Record<string, number> = {
  starter: 0,
  basic: 19,
  pro: 49,
  enterprise: 99,
};

/** Plan ids the checkout will sell. Enterprise is a sales conversation. */
export const PURCHASABLE_PLANS = ["basic", "pro"] as const;

/** Maps a purchased plan id onto the plan stored on the user. */
export const PLAN_TO_USER_PLAN: Record<string, UserPlan> = {
  starter: UserPlan.FREE,
  basic: UserPlan.PRO,
  pro: UserPlan.PRO,
  enterprise: UserPlan.ENTERPRISE,
};

export const findPack = (packId: string): CreditPack | undefined =>
  CREDIT_PACKS.find((pack) => pack.id === packId);

/** Credits a pack delivers, bonus included. */
export const packTotalCredits = (pack: CreditPack): number =>
  pack.credits + pack.bonusCredits;
