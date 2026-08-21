"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProjectSidebar from "./ProjectSidebar";
import GenerationFeed from "./GenerationFeed";
import PromptComposer from "./PromptComposer";
import type { ModelOption } from "./types";
import {
  isPending,
  type CreditsDTO,
  type GenerationDTO,
  type ProjectSummary,
} from "@/lib/types";

/**
 * Studio shell.
 *
 * Holds the three things that have to stay in step - the project list, the
 * generation feed and the credit balance - because a submission changes all of
 * them at once and threading that through a server round trip would make the
 * feed feel laggy on every prompt.
 */
export default function Studio({
  projects: initialProjects,
  activeProjectId: initialActiveId,
  generations: initialGenerations,
  credits: initialCredits,
  models,
  initialPrompt,
  initialModelId,
}: {
  projects: ProjectSummary[];
  activeProjectId: string;
  generations: GenerationDTO[];
  credits: CreditsDTO;
  models: ModelOption[];
  initialPrompt: string;
  initialModelId?: string;
}) {
  const router = useRouter();

  const [projects, setProjects] = useState(initialProjects);
  const [activeId, setActiveId] = useState(initialActiveId);
  const [generations, setGenerations] = useState(initialGenerations);
  const [credits, setCredits] = useState(initialCredits);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Set when the composer is editing an existing result rather than starting fresh. */
  const [editingParent, setEditingParent] = useState<GenerationDTO | null>(null);

  const pendingIds = useMemo(
    () => generations.filter((g) => isPending(g.status)).map((g) => g.id),
    [generations],
  );

  const loadProject = useCallback(async (projectId: string) => {
    setLoadingFeed(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not open that project");
      setGenerations(
        body.project.generations.map((g: GenerationDTO) => ({
          ...g,
          createdAt: String(g.createdAt),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open project");
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  function selectProject(id: string) {
    if (id === activeId) return;
    setActiveId(id);
    setEditingParent(null);
    void loadProject(id);
    // Keep the URL shareable without a full navigation.
    window.history.replaceState(null, "", `/studio?project=${id}`);
  }

  /*
   * Poll while anything is in flight. Webhooks settle jobs on a deployed site,
   * but localhost cannot receive one, and the status route reconciles with the
   * provider on read, so polling is what makes both cases work.
   */
  const pendingKey = pendingIds.join(",");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!pendingKey) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }

    const ids = pendingKey.split(",");

    const tick = async () => {
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/generations/${id}`).catch(() => null);
          if (!res?.ok) return null;
          return (await res.json().catch(() => null)) as {
            generation: GenerationDTO;
            credits: CreditsDTO;
          } | null;
        }),
      );

      const settled = results.filter((r): r is NonNullable<typeof r> =>
        Boolean(r),
      );
      if (!settled.length) return;

      setGenerations((current) =>
        current.map((g) => {
          const match = settled.find((s) => s.generation.id === g.id);
          return match
            ? { ...match.generation, createdAt: String(match.generation.createdAt) }
            : g;
        }),
      );

      // A refund on failure changes the balance, so take the freshest reading.
      setCredits(settled[settled.length - 1]!.credits);
    };

    pollRef.current = setInterval(tick, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [pendingKey]);

  async function submit(input: {
    modelId: string;
    prompt: string;
    aspectRatio: string;
    resolution: string;
    durationSec?: number;
    parentId?: string;
  }) {
    setError(null);

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, projectId: activeId }),
    });
    const body = await res.json();

    if (!res.ok) {
      setError(body.error ?? "Could not start that generation");
      return false;
    }

    setGenerations((current) => [
      ...current,
      { ...body.generation, createdAt: String(body.generation.createdAt) },
    ]);
    setCredits(body.credits);
    setEditingParent(null);

    // Bump the project so the sidebar reorders the way the server will.
    setProjects((current) =>
      [...current]
        .map((p) =>
          p.id === activeId
            ? {
                ...p,
                updatedAt: new Date().toISOString(),
                generationCount: p.generationCount + 1,
              }
            : p,
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );

    return true;
  }

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 gap-4 px-3 py-4 sm:px-5">
      <ProjectSidebar
        projects={projects}
        activeId={activeId}
        onSelect={selectProject}
        onProjectsChange={setProjects}
        onActiveChange={(id) => {
          setActiveId(id);
          void loadProject(id);
        }}
        onRefresh={() => router.refresh()}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <CreditMeter credits={credits} />

        {error ? (
          <p
            role="alert"
            className="border-crimson-500/60 bg-crimson-900/40 text-crimson-200 mt-3 rounded-md border px-3 py-2 text-sm"
          >
            {error}
          </p>
        ) : null}

        <GenerationFeed
          generations={generations}
          models={models}
          loading={loadingFeed}
          onEdit={setEditingParent}
        />

        <PromptComposer
          models={models}
          credits={credits}
          editingParent={editingParent}
          onCancelEdit={() => setEditingParent(null)}
          onSubmit={submit}
          initialPrompt={initialPrompt}
          initialModelId={initialModelId}
        />
      </div>
    </main>
  );
}

function CreditMeter({ credits }: { credits: CreditsDTO }) {
  const pct =
    credits.granted > 0
      ? Math.min(100, Math.round((credits.spent / credits.granted) * 100))
      : 0;

  return (
    <div className="hud flex items-center gap-4 px-4 py-2.5">
      <span className="text-chrome-dim text-xs font-semibold tracking-widest font-label uppercase">
        {credits.plan}
      </span>
      <div
        className="bg-void/80 h-1.5 min-w-0 flex-1 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Credits used this period"
      >
        <div
          className="from-crimson-600 to-crimson-400 h-full bg-gradient-to-r transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-chrome shrink-0 text-xs font-semibold">
        {credits.remaining.toLocaleString()} left
      </span>
    </div>
  );
}
