import { NextResponse } from "next/server";
import { HttpError, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Duplicating copies the generation history so the copy keeps its context, but
 * deliberately does not re-run anything: nothing is charged, and the copied
 * rows point at the same already-paid-for output URLs.
 */
export const POST = route(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  const source = await db.project.findFirst({
    where: { id, userId: user.id },
    include: { generations: { orderBy: { createdAt: "asc" } } },
  });
  if (!source) throw new HttpError(404, "Project not found");

  const copy = await db.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: { name: `${source.name} copy`, userId: user.id },
    });

    if (source.generations.length) {
      await tx.generation.createMany({
        data: source.generations.map((g) => ({
          projectId: created.id,
          userId: user.id,
          kind: g.kind,
          modelId: g.modelId,
          prompt: g.prompt,
          status: g.status,
          outputUrl: g.outputUrl,
          thumbnailUrl: g.thumbnailUrl,
          width: g.width,
          height: g.height,
          durationSec: g.durationSec,
          seed: g.seed,
          // Lineage ids belong to the original project, and the provider job is
          // not re-owned by the copy, so both are dropped.
          creditsCharged: 0,
        })),
      });
    }

    return created;
  });

  return NextResponse.json(
    { project: { id: copy.id, name: copy.name } },
    { status: 201 },
  );
});
