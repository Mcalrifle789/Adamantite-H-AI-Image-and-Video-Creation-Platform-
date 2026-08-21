import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { PageHeader, Section } from "@/components/site/Prose";
import { IMAGE_MODELS, VIDEO_MODELS } from "@/lib/models";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Adamantite H exists: one subscription, one key, and every serious image and video model behind it.",
};

export default function AboutPage() {
  const modelCount = IMAGE_MODELS.length + VIDEO_MODELS.length;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-14 sm:px-6">
        <PageHeader
          eyebrow="About"
          title="One studio, every model"
          lede="Adamantite H puts the whole current generation of image and video
            models behind a single subscription, so the decision you make is
            which model suits the shot — not which vendor you feel like paying
            this month."
        />

        <Section title="The problem">
          <p>
            The good models do not live in one place. Nano Banana is not where
            Kling is, Kling is not where Seedance is, and each one wants its own
            account, its own card on file and its own pile of credits that
            expire on its own schedule. Picking the right tool stops being a
            creative decision and starts being an accounting one.
          </p>
          <p>
            Worse, the credits do not move. Twenty dollars stranded on a
            platform you have stopped using is twenty dollars gone.
          </p>
        </Section>

        <Section title="What we do about it">
          <p>
            One subscription buys one pool of credits, and that pool spends
            across all {modelCount} models on the roster. A cheap draft pass on
            a budget model and one expensive final render on a flagship come out
            of the same balance, which is exactly how the work actually goes.
          </p>
          <p>
            Half of every subscription goes straight back out as provider credit
            on the shared key that runs generation. That is what the allowances
            on the <Link href="/pricing" className="text-crimson-400 hover:text-crimson-300">pricing page</Link>{" "}
            are computed from — they are derived from the credit maths, not
            written by hand, so the headline numbers cannot drift away from what
            a plan actually buys.
          </p>
        </Section>

        <Section title="How we think about it">
          <p>
            <strong className="text-chrome">Models are commodities; the
            workflow is not.</strong> Providers leapfrog each other every few
            months. Generation sits behind an adapter here precisely so today&apos;s
            best model can be swapped for next quarter&apos;s without anything you
            have made moving or breaking.
          </p>
          <p>
            <strong className="text-chrome">Your work stays put.</strong> Every
            generation lands in a project you own. Rename it, duplicate it, bin
            it, pull it back out of the bin. Nothing is deleted out from under
            you because a model was retired.
          </p>
          <p>
            <strong className="text-chrome">The maths is published.</strong>{" "}
            Every model lists its exact credit cost before you spend anything,
            and a job that fails or is withheld is refunded automatically. You
            should never have to guess what a click cost you.
          </p>
        </Section>

        <div className="mt-14 flex flex-wrap gap-3">
          <Link
            href="/models"
            className="btn-primary rounded-md px-6 py-3 text-sm font-semibold"
          >
            See the roster
          </Link>
          <Link
            href="/pricing"
            className="btn-ghost rounded-md px-6 py-3 text-sm font-semibold"
          >
            Plans and limits
          </Link>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
