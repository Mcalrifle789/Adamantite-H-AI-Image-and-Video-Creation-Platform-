import Link from "next/link";
import Logo from "@/components/Logo";
import PixelDust from "@/components/PixelDust";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LandingPrompt from "@/components/LandingPrompt";
import { FEATURED_MODEL_IDS, getModel, TIER_LABEL } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const featured = FEATURED_MODEL_IDS.map(getModel).filter(
    (m): m is NonNullable<typeof m> => Boolean(m),
  );

  return (
    <>
      <SiteHeader />

      <main className="relative flex-1 overflow-hidden">
        <PixelDust className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
        {/* Radial vignette keeps the centre readable against the dust field. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(5,5,7,0.92)_0%,rgba(5,5,7,0.55)_45%,transparent_75%)]"
        />

        <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-16 pb-10 text-center sm:px-6 sm:pt-24">
          <Logo href={null} size="xl" subtitle="Agent" />

          <p className="text-chrome-dim mt-8 max-w-2xl text-base sm:text-lg">
            One studio for the best image and video models on the planet. Pick a
            model, write a prompt, ship the shot.
          </p>

          <LandingPrompt signedIn={Boolean(user)} />

          <div className="mt-14 w-full">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-chrome-dim text-sm font-semibold tracking-[0.2em] font-label uppercase">
                Featured models
              </h2>
              <Link
                href="/models"
                className="text-crimson-400 hover:text-crimson-300 group inline-flex items-center gap-2 text-sm font-semibold transition-colors"
              >
                More models
                <span
                  aria-hidden="true"
                  className="border-crimson-500 inline-flex h-7 w-7 items-center justify-center rounded-full border transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
            </div>

            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {featured.map((model) => (
                <li key={model.id}>
                  <Link
                    href={`/studio?model=${model.id}`}
                    className="hud hud-interactive flex h-full flex-col p-4 text-left"
                  >
                    <span className="text-chrome text-base font-semibold">
                      {model.name}
                    </span>
                    <span className="text-crimson-400 mt-1 text-xs font-semibold tracking-wider font-label uppercase">
                      {TIER_LABEL[model.tier]} ·{" "}
                      {model.kind === "IMAGE" ? "Image" : "Video"}
                    </span>
                    <span className="text-chrome-dim mt-3 text-sm">
                      {model.why}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Every model, one key",
                body: "Nano Banana, Kling, Seedance, GPT Image, Grok, Veo and Sora behind a single subscription. No per-vendor accounts, no separate top-ups.",
              },
              {
                title: "Edit by asking",
                body: "Every result stays in the project. Tell the chat what to change and it re-runs against the image you already made.",
              },
              {
                title: "Credits that add up",
                body: "One pool per month across images and video. Budget models cost a few credits, flagship video costs more, and the maths is published.",
              },
            ].map((card) => (
              <article key={card.title} className="hud p-6">
                <h3 className="font-display text-chrome text-xl">
                  {card.title}
                </h3>
                <p className="text-chrome-dim mt-3 text-sm leading-relaxed">
                  {card.body}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <p className="text-chrome-dim text-sm">
              Plans from $8.99 a month. Cancel whenever.
            </p>
            <Link
              href="/pricing"
              className="btn-primary rounded-md px-6 py-3 text-sm font-semibold"
            >
              See plans and limits
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
