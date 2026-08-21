import { NextResponse } from "next/server";
import { HttpError, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getCreditState } from "@/lib/credits";
import { db } from "@/lib/db";
import { trySettle } from "@/lib/generations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Status read for the studio.
 *
 * Reconciles against the provider on the way through, so the app still resolves
 * jobs on localhost and on any deployment where the webhook cannot reach us.
 */
export const GET = route(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  const existing = await db.generation.findFirst({
    where: { id, userId: user.id },
    select: { id: true, status: true },
  });
  if (!existing) throw new HttpError(404, "Generation not found");

  if (existing.status === "QUEUED" || existing.status === "RUNNING") {
    await trySettle(id);
  }

  const generation = await db.generation.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      kind: true,
      modelId: true,
      prompt: true,
      status: true,
      outputUrl: true,
      thumbnailUrl: true,
      error: true,
      creditsCharged: true,
      durationSec: true,
      createdAt: true,
      completedAt: true,
      parentId: true,
    },
  });

  const credits = await getCreditState(user.id);
  return NextResponse.json({ generation, credits });
});

/** Cancels a job that has not finished, refunding through the settle path. */
export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  const generation = await db.generation.findFirst({
    where: { id, userId: user.id },
    select: { id: true, status: true, providerId: true, providerJobId: true },
  });
  if (!generation) throw new HttpError(404, "Generation not found");

  if (generation.status === "SUCCEEDED") {
    throw new HttpError(409, "That generation has already finished");
  }

  if (generation.providerJobId && generation.providerId) {
    const { providerById } = await import("@/lib/providers");
    const provider = providerById(generation.providerId);
    // A provider that refuses the cancel (already running) still leaves the
    // generation to settle normally, so the failure is not fatal here.
    await provider?.cancel(generation.providerJobId).catch(() => undefined);
  }

  await trySettle(id);
  return NextResponse.json({ ok: true });
});
