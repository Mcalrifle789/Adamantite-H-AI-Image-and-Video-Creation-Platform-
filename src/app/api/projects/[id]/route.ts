import { NextResponse } from "next/server";
import { HttpError, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateProjectSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Every handler scopes its query by `userId` as well as `id`. Checking
 * ownership in the WHERE clause rather than after the fetch means a wrong id
 * cannot leak the existence of someone else's project through a 403.
 */
async function ownedProject(userId: string, id: string) {
  const project = await db.project.findFirst({
    where: { id, userId },
    select: { id: true, name: true, trashedAt: true },
  });
  if (!project) throw new HttpError(404, "Project not found");
  return project;
}

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await ownedProject(user.id, id);

  const project = await db.project.findUniqueOrThrow({
    where: { id },
    include: {
      generations: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          kind: true,
          modelId: true,
          prompt: true,
          status: true,
          outputUrl: true,
          error: true,
          creditsCharged: true,
          createdAt: true,
          parentId: true,
        },
      },
    },
  });

  return NextResponse.json({ project });
});

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await ownedProject(user.id, id);

  const { name, trashed } = updateProjectSchema.parse(await req.json());

  const project = await db.project.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(trashed !== undefined
        ? { trashedAt: trashed ? new Date() : null }
        : {}),
    },
    select: { id: true, name: true, trashedAt: true, updatedAt: true },
  });

  return NextResponse.json({ project });
});

/**
 * Permanent delete. The spec's "send to trash" is the PATCH above; this is the
 * separate, irreversible step from inside the trash view.
 */
export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await ownedProject(user.id, id);

  await db.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
