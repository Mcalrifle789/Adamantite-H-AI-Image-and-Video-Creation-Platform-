import type { PlanId } from "@/generated/prisma/enums";

/**
 * Credit system.
 *
 * The spec states allowances in "number of generations per tier" rather than in
 * credits. Those numbers are all reproducible from a single pool per plan plus a
 * fixed cost per model tier, which is what this file encodes:
 *
 *   image:  budget 3   mid 25   premium 60   high-end 120
 *   video:  budget 250 mid 500  premium 1000            (5-second clip)
 *
 * e.g. MAX = 49,980 credits -> 49,980/3 = 16,660 budget images
 *                           -> 49,980/500 = ~100 mid-tier videos
 * which matches the published allowances. Changing a pool or a cost here changes
 * the marketing numbers in lockstep, because the pricing page derives its table
 * from these values rather than hardcoding them.
 */

export type Tier = "budget" | "mid" | "premium" | "high";

export const IMAGE_CREDITS: Record<Tier, number> = {
  budget: 3,
  mid: 25,
  premium: 60,
  high: 120,
};

/** Cost of a 5-second clip. Longer clips scale linearly, see creditsForVideo(). */
export const VIDEO_CREDITS_PER_5S: Record<Tier, number> = {
  budget: 250,
  mid: 500,
  premium: 1000,
  high: 1000,
};

export const BASE_CLIP_SECONDS = 5;

/** Plans that can actually be bought; excludes the implicit FREE tier. */
export type PaidPlanId = Exclude<PlanId, "FREE">;

export interface Plan<Id extends PlanId = PlanId> {
  id: Id;
  name: string;
  /** Price in cents, to avoid float drift. */
  priceCents: number;
  /** Credits granted at the start of each billing period. */
  credits: number;
  /** Stripe price id, injected from env so the same code runs in test and live. */
  stripePriceEnvKey?: string;
  blurb: string;
  highlight?: boolean;
}

export const PLANS: { [K in PlanId]: Plan<K> } = {
  FREE: {
    id: "FREE",
    name: "Free",
    priceCents: 0,
    credits: 150,
    blurb: "A handful of budget generations so you can try the studio.",
  },
  PORT: {
    id: "PORT",
    name: "Port",
    priceCents: 899,
    credits: 3990,
    stripePriceEnvKey: "STRIPE_PRICE_PORT",
    blurb: "Entry tier. Enough for steady day-to-day image work.",
  },
  STANDARD: {
    id: "STANDARD",
    name: "Standard",
    priceCents: 1799,
    credits: 7980,
    stripePriceEnvKey: "STRIPE_PRICE_STANDARD",
    blurb: "Double the pool. Comfortable for regular video experiments.",
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceCents: 3499,
    credits: 15000,
    stripePriceEnvKey: "STRIPE_PRICE_PRO",
    blurb: "For working creators shipping finished pieces every week.",
    highlight: true,
  },
  MAX: {
    id: "MAX",
    name: "Max",
    priceCents: 10599,
    credits: 49980,
    stripePriceEnvKey: "STRIPE_PRICE_MAX",
    blurb: "Studio volume. Thousands of images or hundreds of clips a month.",
  },
};

/** Paid plans in display order. FREE is deliberately excluded. */
export const PAID_PLANS: Plan<PaidPlanId>[] = [
  PLANS.PORT,
  PLANS.STANDARD,
  PLANS.PRO,
  PLANS.MAX,
];

export const ALL_PLANS: Plan[] = [PLANS.FREE, ...PAID_PLANS];

export function planFor(id: PlanId): Plan {
  return PLANS[id];
}

export function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Video cost scales with duration, rounded up to whole 5-second blocks so a
 * 6-second clip is never cheaper to bill than it is to run.
 */
export function creditsForVideo(tier: Tier, seconds: number): number {
  const blocks = Math.max(1, Math.ceil(seconds / BASE_CLIP_SECONDS));
  return VIDEO_CREDITS_PER_5S[tier] * blocks;
}

/** The allowance table rendered on the pricing page. */
export function allowancesFor(plan: Plan) {
  const imagesFor = (t: Tier) => Math.floor(plan.credits / IMAGE_CREDITS[t]);
  const videosFor = (t: Tier) =>
    Math.floor(plan.credits / VIDEO_CREDITS_PER_5S[t]);
  return {
    images: {
      budget: imagesFor("budget"),
      mid: imagesFor("mid"),
      premium: imagesFor("premium"),
      high: imagesFor("high"),
    },
    videos: {
      budget: videosFor("budget"),
      mid: videosFor("mid"),
      premium: videosFor("premium"),
    },
  };
}
