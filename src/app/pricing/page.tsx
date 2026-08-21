import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CheckoutButton from "@/components/CheckoutButton";
import { getCurrentUser } from "@/lib/auth";
import { getCreditState } from "@/lib/credits";
import {
  allowancesFor,
  formatPrice,
  IMAGE_CREDITS,
  PAID_PLANS,
  VIDEO_CREDITS_PER_5S,
} from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Four plans from $8.99 a month. One credit pool covering every image and video model.",
};

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const user = await getCurrentUser();
  const credits = user ? await getCreditState(user.id) : null;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-14 sm:px-6">
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-chrome text-4xl sm:text-5xl">
            Plans and generation limits
          </h1>
          <p className="text-chrome-dim mt-4 text-base">
            Every plan is one pool of credits you can spend on any model. The
            counts below are what that pool buys if you spend all of it on a
            single tier.
          </p>
        </header>

        <div className="mt-12 grid gap-5 lg:grid-cols-4">
          {PAID_PLANS.map((plan) => {
            const allowance = allowancesFor(plan);
            const isCurrent = credits?.plan === plan.id;

            return (
              <section
                key={plan.id}
                className={`hud flex flex-col p-6 ${plan.highlight ? "ring-crimson-500/40 ring-1" : ""}`}
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-chrome text-2xl">
                    {plan.name}
                  </h2>
                  {plan.highlight ? (
                    <span className="bg-crimson-900 text-crimson-300 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest font-label uppercase">
                      Popular
                    </span>
                  ) : null}
                </div>

                <p className="text-chrome mt-3 text-3xl font-bold">
                  {formatPrice(plan.priceCents)}
                  <span className="text-chrome-faint text-sm font-medium">
                    {" "}
                    / month
                  </span>
                </p>

                <p className="text-chrome-dim mt-3 text-sm">{plan.blurb}</p>

                <p className="text-crimson-400 mt-5 text-sm font-semibold">
                  {plan.credits.toLocaleString()} credits a month
                </p>

                <dl className="text-chrome-dim mt-4 space-y-1.5 text-sm">
                  <Row
                    label="Budget images"
                    value={allowance.images.budget.toLocaleString()}
                  />
                  <Row
                    label="Mid-tier images"
                    value={allowance.images.mid.toLocaleString()}
                  />
                  <Row
                    label="Premium images"
                    value={allowance.images.premium.toLocaleString()}
                  />
                  <Row
                    label="High-end images"
                    value={allowance.images.high.toLocaleString()}
                  />
                  <li
                    className="border-edge/70 !mt-3 border-t pt-3 text-xs tracking-widest font-label uppercase"
                    aria-hidden="true"
                  >
                    5 second video
                  </li>
                  <Row
                    label="Budget videos"
                    value={allowance.videos.budget.toLocaleString()}
                  />
                  <Row
                    label="Mid-tier videos"
                    value={allowance.videos.mid.toLocaleString()}
                  />
                  <Row
                    label="Premium videos"
                    value={allowance.videos.premium.toLocaleString()}
                  />
                </dl>

                <div className="mt-6 pt-2">
                  <CheckoutButton
                    plan={plan.id}
                    planName={plan.name}
                    signedIn={Boolean(user)}
                    isCurrent={isCurrent}
                  />
                </div>
              </section>
            );
          })}
        </div>

        <section className="hud mx-auto mt-14 max-w-3xl p-6">
          <h2 className="font-display text-chrome text-xl">
            How the credits work
          </h2>
          <p className="text-chrome-dim mt-3 text-sm leading-relaxed">
            One generation costs a fixed number of credits based on the tier of
            the model you choose. Nothing is rounded in your favour or against
            it, and a job that fails or is withheld is refunded automatically.
          </p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-crimson-400 text-xs font-bold tracking-widest font-label uppercase">
                Per image
              </h3>
              <dl className="text-chrome-dim mt-2 space-y-1 text-sm">
                <Row label="Budget" value={`${IMAGE_CREDITS.budget} credits`} />
                <Row label="Mid-tier" value={`${IMAGE_CREDITS.mid} credits`} />
                <Row
                  label="Premium"
                  value={`${IMAGE_CREDITS.premium} credits`}
                />
                <Row label="High-end" value={`${IMAGE_CREDITS.high} credits`} />
              </dl>
            </div>
            <div>
              <h3 className="text-crimson-400 text-xs font-bold tracking-widest font-label uppercase">
                Per 5 seconds of video
              </h3>
              <dl className="text-chrome-dim mt-2 space-y-1 text-sm">
                <Row
                  label="Budget"
                  value={`${VIDEO_CREDITS_PER_5S.budget} credits`}
                />
                <Row
                  label="Mid-tier"
                  value={`${VIDEO_CREDITS_PER_5S.mid} credits`}
                />
                <Row
                  label="Premium"
                  value={`${VIDEO_CREDITS_PER_5S.premium} credits`}
                />
              </dl>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-chrome font-semibold">{value}</dd>
    </div>
  );
}
