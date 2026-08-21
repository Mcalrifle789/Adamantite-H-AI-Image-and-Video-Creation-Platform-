"use client";

import { useEffect, useRef } from "react";
import type { ModelOption } from "./types";
import { isPending, type GenerationDTO } from "@/lib/types";

/**
 * The results feed.
 *
 * Reads as a conversation: the prompt, then the result underneath it. Pending
 * work renders a shimmer block at the final aspect ratio rather than a spinner,
 * so the layout does not jump when the image lands.
 */
export default function GenerationFeed({
  generations,
  models,
  loading,
  onEdit,
}: {
  generations: GenerationDTO[];
  models: ModelOption[];
  loading: boolean;
  onEdit: (generation: GenerationDTO) => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const count = generations.length;

  // Follow new results, but only when one is actually added.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [count]);

  if (loading) {
    return (
      <div className="mt-3 flex-1 space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="hud h-64 shimmer" />
        ))}
      </div>
    );
  }

  if (!generations.length) {
    return (
      <div className="mt-3 flex flex-1 items-center justify-center">
        <div className="max-w-sm text-center">
          <p className="font-display text-chrome text-2xl">Nothing here yet</p>
          <p className="text-chrome-dim mt-2 text-sm">
            Pick a model, describe the shot, and it lands here. Ask for a change
            afterwards and it re-runs against the result.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex-1 space-y-5 overflow-y-auto pr-1">
      {generations.map((generation) => {
        const model = models.find((m) => m.id === generation.modelId);
        return (
          <article key={generation.id} className="hud p-4">
            <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-crimson-400 text-xs font-bold tracking-wider font-label uppercase">
                {model?.name ?? generation.modelId}
              </span>
              <span className="text-chrome-faint text-xs">
                {new Date(generation.createdAt).toLocaleString()}
              </span>
              {generation.parentId ? (
                <span className="bg-crimson-900 text-crimson-300 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider font-label uppercase">
                  Edit
                </span>
              ) : null}
              {generation.creditsCharged > 0 ? (
                <span className="text-chrome-faint ml-auto text-xs">
                  {generation.creditsCharged} credits
                </span>
              ) : null}
            </header>

            <p className="text-chrome mt-2 text-sm">{generation.prompt}</p>

            <div className="mt-3">
              <Result generation={generation} onEdit={onEdit} />
            </div>
          </article>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

function Result({
  generation,
  onEdit,
}: {
  generation: GenerationDTO;
  onEdit: (generation: GenerationDTO) => void;
}) {
  if (isPending(generation.status)) {
    return (
      <div>
        <div className="shimmer h-72 w-full rounded-md" />
        <p className="text-chrome-dim animate-pulse-glow mt-2 text-xs">
          {generation.status === "QUEUED" ? "Queued…" : "Rendering…"}
        </p>
      </div>
    );
  }

  if (generation.status !== "SUCCEEDED" || !generation.outputUrl) {
    return (
      <p className="border-crimson-500/50 bg-crimson-900/30 text-crimson-200 rounded-md border px-3 py-2 text-sm">
        {generation.error ?? "This generation did not complete."}
        {generation.creditsCharged === 0 ? " Credits were returned." : ""}
      </p>
    );
  }

  return (
    <figure>
      {generation.kind === "VIDEO" ? (
        <video
          src={generation.outputUrl}
          controls
          playsInline
          preload="metadata"
          className="max-h-[70vh] w-full rounded-md bg-black"
        />
      ) : (
        // Provider CDN hosts are not known at build time, so this stays a plain
        // img rather than next/image with a remotePatterns allowlist to maintain.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={generation.outputUrl}
          alt={generation.prompt}
          loading="lazy"
          className="max-h-[70vh] w-full rounded-md object-contain"
        />
      )}

      <figcaption className="mt-3 flex flex-wrap gap-2">
        <a
          href={generation.outputUrl}
          download
          target="_blank"
          rel="noreferrer"
          className="btn-ghost rounded px-3 py-1.5 text-xs font-semibold"
        >
          Download
        </a>
        <button
          type="button"
          onClick={() => onEdit(generation)}
          className="btn-ghost rounded px-3 py-1.5 text-xs font-semibold"
        >
          Ask for a change
        </button>
      </figcaption>
    </figure>
  );
}
