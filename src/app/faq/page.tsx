import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { PageHeader } from "@/components/site/Prose";
import { IMAGE_CREDITS, PLANS, VIDEO_CREDITS_PER_5S } from "@/lib/plans";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Credits, plans, billing, model choice and account questions, answered.",
};

/*
 * Every number below is read from the same source the studio meters against,
 * so an answer here cannot quietly disagree with what a generation costs.
 */
const QA: { q: string; a: ReactNode }[] = [
  {
    q: "What is a credit?",
    a: (
      <>
        <p>
          One pool per month, spent across images and video. An image on a
          budget model costs {IMAGE_CREDITS.budget} credits; on a high-end model
          it costs {IMAGE_CREDITS.high}. A five-second clip costs{" "}
          {VIDEO_CREDITS_PER_5S.budget.toLocaleString()} credits on a budget
          model and {VIDEO_CREDITS_PER_5S.premium.toLocaleString()} on a premium
          one, scaling in five-second blocks after that.
        </p>
        <p>
          The exact cost is shown next to the button before you submit, so
          nothing is ever spent by surprise.
        </p>
      </>
    ),
  },
  {
    q: "Do unused credits roll over?",
    a: (
      <p>
        No. Each plan grants its full pool at the start of every billing period
        and the balance resets then. The pool is sized so a plan is worth buying
        on its own merits rather than as a way to bank credit.
      </p>
    ),
  },
  {
    q: "What happens if a generation fails?",
    a: (
      <p>
        The credits come back. Spend is recorded in an append-only ledger, and a
        job that errors, times out or is withheld by the provider triggers an
        automatic refund entry against it. You are only ever charged for output
        you actually received.
      </p>
    ),
  },
  {
    q: "Can I edit an image after it is generated?",
    a: (
      <p>
        Yes — that is what the chat box is for. Ask for the change in plain
        language and the studio re-runs against the image you already made
        rather than starting over. The original stays in the project, so you can
        always go back to it. Each edit is a new generation and costs the model&apos;s
        normal rate.
      </p>
    ),
  },
  {
    q: "Do I need my own API keys?",
    a: (
      <p>
        No. Generation runs through one provider key held server-side, funded
        out of your subscription. You never see a provider dashboard, never
        top up a second balance, and never have a key of your own to leak.
      </p>
    ),
  },
  {
    q: "Which model should I use?",
    a: (
      <p>
        Draft on a budget model, finish on a flagship. Budget models are cheap
        enough to iterate on freely, and the difference only really shows on the
        final pass. The{" "}
        <Link href="/models" className="text-crimson-400 hover:text-crimson-300">
          roster
        </Link>{" "}
        lists what each model is actually good at alongside its cost.
      </p>
    ),
  },
  {
    q: "Can I change or cancel my plan?",
    a: (
      <p>
        Any time, from your account page. Billing is handled by Stripe, so
        upgrades, downgrades and cancellations all go through their portal and
        take effect from the next period. Cancelling leaves your projects and
        everything you have generated intact.
      </p>
    ),
  },
  {
    q: "Why was I signed out?",
    a: (
      <p>
        Sessions end after one hour of inactivity. That is enforced on the
        server, not just in the browser, so a session left open on a shared or
        borrowed machine cannot be picked up later. Signing back in returns you
        to where you were.
      </p>
    ),
  },
  {
    q: "Who owns what I generate?",
    a: (
      <p>
        You do, as far as we are concerned — see the{" "}
        <Link href="/terms" className="text-crimson-400 hover:text-crimson-300">
          terms
        </Link>
        . We claim no ownership over your prompts or your output. Note that the
        underlying model providers have their own usage policies, and that the
        copyright status of AI-generated work differs by country.
      </p>
    ),
  },
  {
    q: "Is there a free tier?",
    a: (
      <p>
        Registering gives you {PLANS.FREE.credits} credits — enough to try the
        studio on budget models and see whether it fits how you work. No card is
        needed to sign up.
      </p>
    ),
  },
];

export default function FaqPage() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-14 sm:px-6">
        <PageHeader
          eyebrow="Help"
          title="Frequently asked"
          lede="Credits, billing, models and accounts. If the answer you need is
            not here, ask us directly."
        />

        <div className="mt-12 max-w-3xl space-y-3">
          {QA.map(({ q, a }) => (
            <details key={q} className="hud group p-5" name="faq">
              <summary className="text-chrome flex cursor-pointer list-none items-center gap-3 text-base font-semibold">
                <span
                  aria-hidden="true"
                  className="text-crimson-400 shrink-0 transition-transform group-open:rotate-45"
                >
                  +
                </span>
                {q}
              </summary>
              <div className="text-chrome-dim mt-4 space-y-3 pl-7 text-sm leading-relaxed">
                {a}
              </div>
            </details>
          ))}
        </div>

        <p className="text-chrome-dim mt-12 text-sm">
          Still stuck?{" "}
          <Link
            href="/contact"
            className="text-crimson-400 hover:text-crimson-300 font-semibold"
          >
            Get in touch
          </Link>
          .
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
