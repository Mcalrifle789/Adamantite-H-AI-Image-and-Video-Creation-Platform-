import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";
import IdleWatcher from "@/components/IdleWatcher";
import Studio from "@/components/studio/Studio";
import { getCurrentUser } from "@/lib/auth";
import { getCreditState } from "@/lib/credits";
import { db } from "@/lib/db";
import { ALL_MODELS, getModel } from "@/lib/models";
import type { GenerationDTO, ProjectSummary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Studio",
  description: "Generate and edit images and video.",
};

export const dynamic = "force-dynamic";

export default async function StudioPage({
  searchParams,
}: PageProps<"/studio">) {
  const user = await getCurrentUser();
  if (!user) {
    // Preserve whatever was typed on the landing page through the sign-in.
    const params = await searchParams;
    const prompt = typeof params.prompt === "string" ? params.prompt : null;
    redirect(prompt ? `/login?prompt=${encodeURIComponent(prompt)}` : "/login");
  }

  const params = await searchParams;
  const initialPrompt = typeof params.prompt === "string" ? params.prompt : "";
  const requestedModel =
    typeof params.model === "string" ? getModel(params.model)?.id : undefined;
  const requestedProject =
    typeof params.project === "string" ? params.project : undefined;

  const projectRows = await db.project.findMany({
    where: { userId: user.id, trashedAt: null },
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

  // Everyone lands in a project, so a brand new account has somewhere to type.
  let projects: ProjectSummary[] = projectRows.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    trashedAt: p.trashedAt?.toISOString() ?? null,
    generationCount: p._count.generations,
  }));

  if (!projects.length) {
    const created = await db.project.create({
      data: { name: "First project", userId: user.id },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
    projects = [
      {
        id: created.id,
        name: created.name,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        trashedAt: null,
        generationCount: 0,
      },
    ];
  }

  const activeId =
    projects.find((p) => p.id === requestedProject)?.id ?? projects[0]!.id;

  const generationRows = await db.generation.findMany({
    where: { projectId: activeId },
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
  });

  const generations: GenerationDTO[] = generationRows.map((g) => ({
    ...g,
    createdAt: g.createdAt.toISOString(),
  }));

  const credits = await getCreditState(user.id);

  return (
    <>
      <SiteHeader />
      <IdleWatcher />
      <Suspense fallback={null}>
        <Studio
          projects={projects}
          activeProjectId={activeId}
          generations={generations}
          credits={{
            plan: credits.plan,
            granted: credits.granted,
            spent: credits.spent,
            remaining: credits.remaining,
          }}
          models={ALL_MODELS.map((m) => ({
            id: m.id,
            name: m.name,
            kind: m.kind,
            tier: m.tier,
            why: m.why,
            top: m.top ?? false,
            isNew: m.isNew ?? false,
            maxDurationSec: m.maxDurationSec ?? null,
          }))}
          initialPrompt={initialPrompt}
          initialModelId={requestedModel}
        />
      </Suspense>
    </>
  );
}
