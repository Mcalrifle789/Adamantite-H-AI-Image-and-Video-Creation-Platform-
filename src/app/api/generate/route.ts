import { NextResponse } from "next/server";
import { HttpError, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getCreditState, refundCredits, spendCredits } from "@/lib/credits";
import { db } from "@/lib/db";
import { creditsForModel, getModel } from "@/lib/models";
import { providerFor } from "@/lib/providers";
import { webhookUrlFor } from "@/lib/webhook";
import { generateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Submits one generation.
 *
 * Ordering matters here. The row is written first so there is always something
 * to attach a charge and a provider job to; credits are debited before the
 * provider call so a burst of parallel requests cannot overspend; and if the
 * provider then refuses the job the charge is refunded in the same request.
 * The alternative - charging on completion - would let someone with zero
 * credits queue unlimited work.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const input = generateSchema.parse(await req.json());

  const model = getModel(input.modelId);
  if (!model) throw new HttpError(400, "Unknown model");

  const project = await db.project.findFirst({
    where: { id: input.projectId, userId: user.id, trashedAt: null },
    select: { id: true },
  });
  if (!project) throw new HttpError(404, "Project not found");

  if (model.kind === "VIDEO" && input.durationSec && model.maxDurationSec) {
    if (input.durationSec > model.maxDurationSec) {
      throw new HttpError(
        400,
        `${model.name} generates at most ${model.maxDurationSec} seconds`,
      );
    }
  }

  // A chat edit re-runs against an earlier output, so its URL becomes the input.
  let parentUrl: string | undefined;
  if (input.parentId) {
    const parent = await db.generation.findFirst({
      where: { id: input.parentId, userId: user.id },
      select: { outputUrl: true, status: true },
    });
    if (!parent || parent.status !== "SUCCEEDED" || !parent.outputUrl) {
      throw new HttpError(400, "That generation cannot be used as a source");
    }
    parentUrl = parent.outputUrl;
  }

  const cost = creditsForModel(model, input.durationSec);

  const generation = await db.generation.create({
    data: {
      projectId: project.id,
      userId: user.id,
      kind: model.kind,
      modelId: model.id,
      prompt: input.prompt,
      parentId: input.parentId ?? null,
      status: "QUEUED",
      providerId: model.provider,
      durationSec: input.durationSec ?? null,
      seed: input.seed ?? null,
    },
  });

  let periodStart: Date;
  try {
    const state = await spendCredits({
      userId: user.id,
      amount: cost,
      reason: `generate:${model.id}`,
      modelId: model.id,
      generationId: generation.id,
    });
    periodStart = state.periodStart;
  } catch (err) {
    await db.generation.update({
      where: { id: generation.id },
      data: { status: "FAILED", error: "Not enough credits" },
    });
    throw err;
  }

  await db.generation.update({
    where: { id: generation.id },
    data: { creditsCharged: cost },
  });

  try {
    const provider = providerFor(model);
    const submitted = await provider.submit({
      model,
      prompt: input.prompt,
      imageUrls: parentUrl ? [parentUrl] : undefined,
      aspectRatio: input.aspectRatio,
      resolution: input.resolution,
      durationSec: input.durationSec,
      seed: input.seed,
      webhookUrl: webhookUrlFor(model.provider),
    });

    const updated = await db.generation.update({
      where: { id: generation.id },
      data: {
        providerJobId: submitted.jobId,
        status: submitted.status === "running" ? "RUNNING" : "QUEUED",
      },
      select: {
        id: true,
        status: true,
        kind: true,
        modelId: true,
        prompt: true,
        creditsCharged: true,
        createdAt: true,
      },
    });

    // Touch the project so the sidebar reorders by recent activity.
    await db.project.update({
      where: { id: project.id },
      data: { updatedAt: new Date() },
    });

    const credits = await getCreditState(user.id);
    return NextResponse.json({ generation: updated, credits }, { status: 202 });
  } catch (err) {
    // The provider never took the job, so the charge is not owed.
    await refundCredits({
      userId: user.id,
      amount: cost,
      reason: `refund:submit-failed:${model.id}`,
      generationId: generation.id,
      periodStart,
    });
    await db.generation.update({
      where: { id: generation.id },
      data: {
        status: "FAILED",
        creditsCharged: 0,
        error: err instanceof Error ? err.message : "Submission failed",
        completedAt: new Date(),
      },
    });
    throw err;
  }
});
