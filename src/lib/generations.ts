import "server-only";

import { db } from "./db";
import { refundCredits } from "./credits";
import { getModel } from "./models";
import { providerById } from "./providers";
import type { GenerationStatus } from "@/generated/prisma/enums";

/**
 * Reconciles one generation against its provider.
 *
 * Both the webhook and the studio's polling call this, and neither is trusted
 * to supply the outcome: the status always comes from an authenticated read.
 * That keeps an unsigned webhook from being able to mark a job succeeded with
 * an attacker-supplied URL, and makes the function idempotent, which matters
 * because Higgsfield explicitly may deliver the same event more than once.
 */

const TERMINAL: GenerationStatus[] = ["SUCCEEDED", "FAILED", "CANCELED"];

export async function settleGeneration(generationId: string): Promise<void> {
  const generation = await db.generation.findUnique({
    where: { id: generationId },
    select: {
      id: true,
      userId: true,
      status: true,
      providerId: true,
      providerJobId: true,
      modelId: true,
      creditsCharged: true,
      createdAt: true,
    },
  });

  if (!generation || !generation.providerJobId || !generation.providerId) return;
  if (TERMINAL.includes(generation.status)) return;

  const provider = providerById(generation.providerId);
  if (!provider) return;

  const state = await provider.getStatus(generation.providerJobId);

  if (state.status === "queued") return;

  if (state.status === "running") {
    if (generation.status !== "RUNNING") {
      await db.generation.update({
        where: { id: generation.id },
        data: { status: "RUNNING" },
      });
    }
    return;
  }

  if (state.status === "succeeded" && state.outputUrl) {
    const model = getModel(generation.modelId);
    await db.generation.update({
      where: { id: generation.id },
      data: {
        status: "SUCCEEDED",
        outputUrl: state.outputUrl,
        // Images are their own thumbnail; video needs a poster frame, which is
        // left null until an extraction step exists.
        thumbnailUrl: model?.kind === "IMAGE" ? state.outputUrl : null,
        completedAt: new Date(),
        error: null,
      },
    });
    return;
  }

  // Everything below is a non-success terminal state, so the charge is returned.
  const status: GenerationStatus =
    state.status === "canceled" ? "CANCELED" : "FAILED";

  const message =
    state.error ??
    (state.status === "rejected"
      ? "The safety filter withheld this result"
      : state.status === "canceled"
        ? "Canceled"
        : "Generation failed");

  await db.$transaction(async (tx) => {
    // Re-read inside the transaction so two concurrent settles cannot both
    // refund the same generation.
    const current = await tx.generation.findUnique({
      where: { id: generation.id },
      select: { status: true, creditsCharged: true },
    });
    if (!current || TERMINAL.includes(current.status)) return;

    await tx.generation.update({
      where: { id: generation.id },
      data: {
        status,
        error: message,
        completedAt: new Date(),
        creditsCharged: 0,
      },
    });

    if (current.creditsCharged > 0) {
      await tx.usageEntry.create({
        data: {
          userId: generation.userId,
          delta: current.creditsCharged,
          reason: `refund:${status.toLowerCase()}:${generation.modelId}`,
          generationId: generation.id,
          // Refund lands in the window the spend belongs to, not today's.
          periodStart: await periodStartForSpend(tx, generation.id),
        },
      });
    }
  });
}

/**
 * Finds the window the original debit was recorded against, falling back to the
 * user's current window if the ledger row is somehow missing.
 */
async function periodStartForSpend(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  generationId: string,
): Promise<Date> {
  const spend = await tx.usageEntry.findFirst({
    where: { generationId, delta: { lt: 0 } },
    select: { periodStart: true },
    orderBy: { createdAt: "asc" },
  });
  if (spend) return spend.periodStart;

  const generation = await tx.generation.findUniqueOrThrow({
    where: { id: generationId },
    select: { user: { select: { periodStart: true } } },
  });
  return generation.user.periodStart;
}

/** Convenience wrapper that swallows provider faults, for use in polling. */
export async function trySettle(generationId: string): Promise<void> {
  try {
    await settleGeneration(generationId);
  } catch (err) {
    console.warn(`settleGeneration(${generationId}) failed:`, err);
  }
}

export { refundCredits };
