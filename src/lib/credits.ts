import "server-only";

import { db } from "./db";
import { planFor } from "./plans";
import type { PlanId } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Credit accounting.
 *
 * The ledger (`UsageEntry`) is append-only and every row is stamped with the
 * `periodStart` that was current when it was written. A balance is therefore
 * "plan grant minus the sum of this period's deltas", which means a period
 * rollover costs nothing - old rows simply stop matching the filter - and a
 * refund is just another row rather than a mutation of a counter.
 */

export interface CreditState {
  plan: PlanId;
  granted: number;
  spent: number;
  remaining: number;
  periodStart: Date;
  periodEnd: Date | null;
}

/** Free and lapsed accounts roll over on a fixed 30-day cadence. */
const FALLBACK_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

type Tx = Prisma.TransactionClient;

/**
 * Advances the metering window if it has elapsed. Stripe drives this for paid
 * plans via the webhook; this covers free accounts and any window that lapsed
 * while a subscription was being retried.
 */
async function rollPeriodIfElapsed(client: Tx, userId: string) {
  const user = await client.user.findUniqueOrThrow({
    where: { id: userId },
    select: { periodStart: true, periodEnd: true },
  });

  const now = new Date();
  const end =
    user.periodEnd ?? new Date(user.periodStart.getTime() + FALLBACK_PERIOD_MS);

  if (end > now) return user.periodStart;

  // Jump straight to the current window rather than replaying every missed one.
  let start = end;
  while (start.getTime() + FALLBACK_PERIOD_MS <= now.getTime()) {
    start = new Date(start.getTime() + FALLBACK_PERIOD_MS);
  }
  const nextEnd = new Date(start.getTime() + FALLBACK_PERIOD_MS);

  await client.user.update({
    where: { id: userId },
    data: { periodStart: start, periodEnd: nextEnd },
  });
  return start;
}

export async function getCreditState(userId: string): Promise<CreditState> {
  const periodStart = await rollPeriodIfElapsed(db, userId);

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { plan: true, subscriptionStatus: true, periodEnd: true },
  });

  // A lapsed subscription drops to the free grant rather than to zero, so a
  // failed card does not lock someone out of the product entirely.
  const effectivePlan: PlanId =
    user.subscriptionStatus === "ACTIVE" || user.plan === "FREE"
      ? user.plan
      : "FREE";

  const granted = planFor(effectivePlan).credits;

  const agg = await db.usageEntry.aggregate({
    where: { userId, periodStart },
    _sum: { delta: true },
  });

  const spent = -(agg._sum.delta ?? 0);
  return {
    plan: effectivePlan,
    granted,
    spent,
    remaining: Math.max(0, granted - spent),
    periodStart,
    periodEnd: user.periodEnd,
  };
}

export class InsufficientCreditsError extends Error {
  status = 402;
  constructor(
    readonly required: number,
    readonly remaining: number,
  ) {
    super(`Needs ${required} credits, ${remaining} remaining`);
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Debits credits, refusing to go negative.
 *
 * Runs Serializable so two generations submitted at the same instant cannot
 * both read the same balance and both succeed. Callers should treat a
 * serialization failure as retryable.
 */
export async function spendCredits(params: {
  userId: string;
  amount: number;
  reason: string;
  modelId?: string;
  generationId?: string;
}): Promise<CreditState> {
  const { userId, amount, reason, modelId, generationId } = params;
  if (amount <= 0) throw new Error("spendCredits requires a positive amount");

  return db.$transaction(
    async (tx) => {
      const periodStart = await rollPeriodIfElapsed(tx, userId);

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { plan: true, subscriptionStatus: true, periodEnd: true },
      });

      const effectivePlan: PlanId =
        user.subscriptionStatus === "ACTIVE" || user.plan === "FREE"
          ? user.plan
          : "FREE";
      const granted = planFor(effectivePlan).credits;

      const agg = await tx.usageEntry.aggregate({
        where: { userId, periodStart },
        _sum: { delta: true },
      });
      const spent = -(agg._sum.delta ?? 0);
      const remaining = Math.max(0, granted - spent);

      if (remaining < amount) {
        throw new InsufficientCreditsError(amount, remaining);
      }

      await tx.usageEntry.create({
        data: {
          userId,
          delta: -amount,
          reason,
          modelId: modelId ?? null,
          generationId: generationId ?? null,
          periodStart,
        },
      });

      return {
        plan: effectivePlan,
        granted,
        spent: spent + amount,
        remaining: remaining - amount,
        periodStart,
        periodEnd: user.periodEnd,
      } satisfies CreditState;
    },
    { isolationLevel: "Serializable" },
  );
}

/**
 * Returns credits for a job that never produced output. Written against the
 * period the original spend belongs to, so a refund after a rollover credits
 * the right window instead of inflating the new one.
 */
export async function refundCredits(params: {
  userId: string;
  amount: number;
  reason: string;
  generationId?: string;
  periodStart: Date;
}): Promise<void> {
  const { userId, amount, reason, generationId, periodStart } = params;
  if (amount <= 0) return;

  await db.usageEntry.create({
    data: {
      userId,
      delta: amount,
      reason,
      generationId: generationId ?? null,
      periodStart,
    },
  });
}
