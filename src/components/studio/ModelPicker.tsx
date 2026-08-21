"use client";

import { useEffect, useRef, useState } from "react";
import type { ModelOption } from "./types";
import { TIER_LABEL } from "@/lib/models";
import type { Tier } from "@/lib/plans";

const TIER_ORDER: Tier[] = ["budget", "mid", "premium", "high"];

/**
 * Model selector.
 *
 * A native select would collapse the tier, the rationale and the cost into one
 * line of text, so this is a disclosure panel instead. It still behaves like a
 * menu for the keyboard: Escape closes it and focus returns to the trigger.
 */
export default function ModelPicker({
  models,
  value,
  onChange,
}: {
  models: ModelOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"IMAGE" | "VIDEO">(
    models.find((m) => m.id === value)?.kind ?? "IMAGE",
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const selected = models.find((m) => m.id === value);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const visible = models.filter((m) => m.kind === kind);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="btn-ghost rounded px-3 py-1.5 text-xs font-semibold"
      >
        {selected ? selected.name : "Choose a model"}
        <span aria-hidden="true" className="text-chrome-faint ml-2">
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose a model"
          className="hud absolute bottom-full left-0 z-30 mb-2 max-h-[60vh] w-[min(30rem,85vw)] overflow-y-auto p-3"
        >
          <div className="mb-3 flex gap-2">
            {(["IMAGE", "VIDEO"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`rounded px-3 py-1 text-xs font-bold tracking-wider font-label uppercase transition-colors ${
                  kind === k
                    ? "bg-crimson-600 text-white"
                    : "text-chrome-dim hover:text-chrome"
                }`}
              >
                {k === "IMAGE" ? "Image" : "Video"}
              </button>
            ))}
          </div>

          {TIER_ORDER.map((tier) => {
            const inTier = visible.filter((m) => m.tier === tier);
            if (!inTier.length) return null;

            return (
              <section key={tier} className="mb-3">
                <h3 className="text-crimson-400 mb-1.5 text-[10px] font-bold tracking-[0.25em] font-label uppercase">
                  {TIER_LABEL[tier]}
                </h3>
                <ul className="space-y-1">
                  {inTier.map((model) => (
                    <li key={model.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(model.id);
                          setOpen(false);
                          triggerRef.current?.focus();
                        }}
                        aria-pressed={model.id === value}
                        className={`w-full rounded px-2 py-1.5 text-left transition-colors ${
                          model.id === value
                            ? "bg-crimson-900/60"
                            : "hover:bg-crimson-900/30"
                        }`}
                      >
                        <span className="text-chrome flex items-center gap-2 text-sm font-semibold">
                          {model.name}
                          {model.top ? <Tag>Top</Tag> : null}
                          {model.isNew ? <Tag>New</Tag> : null}
                        </span>
                        <span className="text-chrome-faint block text-xs">
                          {model.why}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-crimson-900 text-crimson-300 rounded px-1 py-0.5 text-[9px] font-bold tracking-wider font-label uppercase">
      {children}
    </span>
  );
}
