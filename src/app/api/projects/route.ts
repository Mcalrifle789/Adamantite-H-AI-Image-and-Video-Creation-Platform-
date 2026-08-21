import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createProjectSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  const user = await requireUser();
  const trashed = new URL(req.url).searchParams.get("trashed") === "1";

  const projects = await db.project.findMany({
    where: { userId: user.id, trashedAt: trashed ? { not: null } : null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      trashedAt: true,
      _count: { select: { generations: true } },
    },
  });

  return NextResponse.json({ projects });
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const { name } = createProjectSchema.parse(body);

  const project = await db.project.create({
    data: { name, userId: user.id },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ project }, { status: 201 });
});
