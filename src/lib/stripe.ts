import "server-only";

import Stripe from "stripe";
import { PLANS } from "./plans";
import type { PlanId } from "@/generated/prisma/enums";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client = new Stripe(key);
  return client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Price ids live in env rather than in the plan table so the same build runs
 * against test and live keys without a code change.
 */
export function priceIdFor(plan: PlanId): string {
  const key = PLANS[plan].stripePriceEnvKey;
  if (!key) throw new Error(`Plan ${plan} is not purchasable`);
  const priceId = process.env[key];
  if (!priceId) throw new Error(`${key} is not set`);
  return priceId;
}

/** Reverse lookup used by the webhook to turn a price back into a plan. */
export function planForPriceId(priceId: string): PlanId | null {
  for (const plan of Object.values(PLANS)) {
    if (!plan.stripePriceEnvKey) continue;
    if (process.env[plan.stripePriceEnvKey] === priceId) return plan.id;
  }
  return null;
}
