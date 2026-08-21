"use client";

import { useMemo, useState } from "react";
import ModelPicker from "./ModelPicker";
import {
  ASPECT_RATIOS,
  RESOLUTIONS,
  type AspectRatio,
  type ModelOption,
  type Resolution,
} from "./types";
import { IMAGE_CREDITS, VIDEO_CREDITS_PER_5S } from "@/lib/plans";
import type { CreditsDTO, GenerationDTO } from "@/lib/types";

/**
 * Prompt bar and controls.
 *
 * Shows the exact credit cost of the current settings before submitting and
 * blocks the submit when the balance will not cover it, so the cost is never a
 * surprise after the fact.
 */
export default function PromptComposer({
  models,
  credits,
  editingParent,
  onCancelEdit,
  onSubmit,
  initialPrompt,
  initialModelId,
}: {
  models: ModelOption[];
  credits: CreditsDTO;
  editingParent: GenerationDTO | null;
  onCancelEdit: () => void;
  onSubmit: (input: {
    modelId: string;
    prompt: string;
    aspectRatio: string;
    resolution: string;
    durationSec?: number;
    parentId?: string;
  }) => Promise<boolean>;
  initialPrompt: string;
  initialModelId?: string;
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [modelId, setModelId] = useState(
    initialModelId ?? models.find((m) => m.top)?.id ?? models[0]!.id,
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [resolution, setResolution] = useState<Resolution>("720p");
  const [durationSec, setDurationSec] = useState(5);
  const [pending, setPending] = useState(false);

  /*
   * Editing an existing result only makes sense on a model of the same kind, so
   * an image edit falls back to an image model. Derived rather than synced into
   * state with an effect: the substitution is a pure function of the selection
   * and what is being edited, and mirroring it into state would render twice
   * and leave two places that could disagree.
   */
  const model = useMemo(() => {
    const chosen = models.find((m) => m.id === modelId) ?? models[0]!;
    if (!editingParent || chosen.kind === editingParent.kind) return chosen;
    return (
      models.find((m) => m.kind === editingParent.kind && m.top) ??
      models.find((m) => m.kind === editingParent.kind) ??
      chosen
    );
  }, [models, modelId, editingParent]);

  const cost = useMemo(() => {
    if (model.kind === "IMAGE") return IMAGE_CREDITS[model.tier];
    const blocks = Math.max(1, Math.ceil(durationSec / 5));
    const perBlock =
      VIDEO_CREDITS_PER_5S[model.tier as keyof typeof VIDEO_CREDITS_PER_5S];
    return perBlock * blocks;
  }, [model, durationSec]);

  const affordable = credits.remaining >= cost;
  const canSubmit = prompt.trim().length > 0 && affordable && !pending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    const ok = await onSubmit({
      modelId: model.id,
      prompt: prompt.trim(),
      aspectRatio,
      resolution,
      durationSec: model.kind === "VIDEO" ? durationSec : undefined,
      parentId: editingParent?.id,
    });
    setPending(false);
    if (ok) setPrompt("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      {editingParent ? (
        <div className="hud hud-magenta mb-2 flex items-center gap-3 px-4 py-2">
          <span className="text-chrome-dim min-w-0 flex-1 truncate text-xs">
            Editing:{" "}
            <span className="text-chrome">{editingParent.prompt}</span>
          </span>
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-chrome-faint hover:text-chrome text-xs font-semibold"
          >
            Cancel
          </button>
        </div>
      ) : null}

      <div className="hud p-3">
        <label htmlFor="studio-prompt" className="sr-only">
          {editingParent ? "Describe the change" : "Describe what to create"}
        </label>
        <textarea
          id="studio-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            // Enter submits, Shift+Enter breaks the line.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit(e);
            }
          }}
          rows={2}
          placeholder={
            editingParent
              ? "What should change? e.g. warmer light, remove the sign"
              : "ask anything..."
          }
          /* Spec calls out the chat box by name: pinned to the shipped Raleway
             cut rather than the browser default textarea face. */
          className="font-sans text-chrome placeholder:text-chrome-faint w-full resize-none bg-transparent px-2 py-1 text-sm leading-relaxed tracking-[0.01em] outline-none"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ModelPicker models={models} value={model.id} onChange={setModelId} />

          <Select
            label="Aspect"
            value={aspectRatio}
            options={ASPECT_RATIOS}
            onChange={(v) => setAspectRatio(v as AspectRatio)}
          />

          <Select
            label="Resolution"
            value={resolution}
            options={RESOLUTIONS}
            onChange={(v) => setResolution(v as Resolution)}
          />

          {model.kind === "VIDEO" ? (
            <label className="text-chrome-dim flex items-center gap-2 text-xs">
              <span className="font-semibold tracking-wider font-label uppercase">
                Seconds
              </span>
              <input
                type="number"
                min={1}
                max={model.maxDurationSec ?? 10}
                value={durationSec}
                onChange={(e) =>
                  setDurationSec(
                    Math.max(
                      1,
                      Math.min(
                        model.maxDurationSec ?? 10,
                        Number(e.target.value) || 1,
                      ),
                    ),
                  )
                }
                className="field w-16 rounded px-2 py-1 text-sm"
              />
            </label>
          ) : null}

          <span
            className={`ml-auto text-xs font-semibold ${
              affordable ? "text-chrome-dim" : "text-crimson-300"
            }`}
          >
            {cost} credits
            {affordable ? "" : " · not enough left"}
          </span>

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary rounded-md px-5 py-2 text-sm font-semibold"
          >
            {pending ? "Sending…" : editingParent ? "Apply change" : "Generate"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-chrome-dim flex items-center gap-2 text-xs">
      <span className="font-semibold tracking-wider font-label uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field rounded px-2 py-1 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-panel">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
