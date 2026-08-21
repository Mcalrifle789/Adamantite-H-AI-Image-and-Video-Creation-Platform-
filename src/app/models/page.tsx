import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  creditsForModel,
  IMAGE_MODELS,
  TIER_LABEL,
  VIDEO_MODELS,
  type ModelDef,
} from "@/lib/models";
import type { Tier } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Models",
  description:
    "Every image and video model on Adamantite H, with the credit cost of each.",
};

const TIER_ORDER: Tier[] = ["budget", "mid", "premium", "high"];

export default function ModelsPage() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-14 sm:px-6">
        <header className="max-w-3xl">
          <h1 className="font-display text-chrome text-4xl sm:text-5xl">
            The roster
          </h1>
          <p className="text-chrome-dim mt-4">
            Grouped by what they cost to run. Every model draws from the same
            credit pool, so mixing a cheap draft pass with one expensive final
            render is the intended way to work.
          </p>
        </header>

        <ModelSection
          title="Image models"
          models={IMAGE_MODELS}
          tiers={TIER_ORDER}
        />
        <ModelSection
          title="Video models"
          models={VIDEO_MODELS}
          tiers={["budget", "mid", "premium"]}
          footnote="Video costs are quoted for a 5 second clip and scale in 5 second blocks."
        />
      </main>

      <SiteFooter />
    </>
  );
}

function ModelSection({
  title,
  models,
  tiers,
  footnote,
}: {
  title: string;
  models: ModelDef[];
  tiers: Tier[];
  footnote?: string;
}) {
  return (
    <section className="mt-14">
      <h2 className="font-display text-chrome text-2xl">{title}</h2>
      {footnote ? (
        <p className="text-chrome-faint mt-1 text-sm">{footnote}</p>
      ) : null}

      {tiers.map((tier) => {
        const inTier = models.filter((m) => m.tier === tier);
        if (!inTier.length) return null;

        return (
          <div key={tier} className="mt-8">
            <h3 className="text-crimson-400 text-xs font-bold tracking-[0.25em] font-label uppercase">
              {TIER_LABEL[tier]}
            </h3>
            <ul className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inTier.map((model) => (
                <li key={model.id}>
                  <Link
                    href={`/studio?model=${model.id}`}
                    className="hud hud-interactive flex h-full flex-col p-5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-chrome font-semibold">
                        {model.name}
                      </span>
                      <span className="flex shrink-0 gap-1">
                        {model.top ? <Badge>Top</Badge> : null}
                        {model.isNew ? <Badge>New</Badge> : null}
                      </span>
                    </div>

                    <p className="text-chrome-dim mt-2 flex-1 text-sm">
                      {model.why}
                    </p>
                    <p className="text-chrome-faint mt-2 text-xs">
                      {model.notes}
                    </p>

                    <p className="border-edge/70 text-crimson-300 mt-4 border-t pt-3 text-xs font-semibold">
                      {creditsForModel(model)} credits
                      {model.kind === "VIDEO" ? " per 5s" : ""}
                      {model.maxDurationSec
                        ? ` · up to ${model.maxDurationSec}s`
                        : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-crimson-900 text-crimson-300 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider font-label uppercase">
      {children}
    </span>
  );
}
