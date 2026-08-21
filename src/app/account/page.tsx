import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import IdleWatcher from "@/components/IdleWatcher";
import { getCurrentUser, IDLE_TIMEOUT_MS } from "@/lib/auth";
import { getCreditState } from "@/lib/credits";
import { db } from "@/lib/db";
import { formatPrice, planFor } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Account",
  description: "Your plan, credit usage and recent activity.",
};

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: PageProps<"/account">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const justSubscribed = params.checkout === "success";

  const credits = await getCreditState(user.id);
  const plan = planFor(credits.plan);

  const [record, recentSpend] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { subscriptionStatus: true, createdAt: true, periodEnd: true },
    }),
    db.usageEntry.findMany({
      where: { userId: user.id, periodStart: credits.periodStart },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        delta: true,
        reason: true,
        modelId: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <>
      <SiteHeader />
      <IdleWatcher />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="font-display text-chrome text-4xl">Account</h1>

        {justSubscribed ? (
          <p
            role="status"
            className="border-crimson-500/60 bg-crimson-900/40 text-crimson-100 mt-5 rounded-md border px-4 py-3 text-sm"
          >
            Payment received. Your plan updates as soon as Stripe confirms it —
            usually within a few seconds.
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <section className="hud p-6">
            <h2 className="text-chrome-dim text-xs font-bold tracking-[0.2em] font-label uppercase">
              Plan
            </h2>
            <p className="font-display text-chrome mt-2 text-3xl">
              {plan.name}
            </p>
            <p className="text-chrome-dim mt-1 text-sm">
              {formatPrice(plan.priceCents)}
              {plan.priceCents > 0 ? " / month" : ""}
              {record.subscriptionStatus !== "NONE"
                ? ` · ${record.subscriptionStatus.toLowerCase().replace("_", " ")}`
                : ""}
            </p>
            {record.periodEnd ? (
              <p className="text-chrome-faint mt-3 text-xs">
                Credits reset {new Date(record.periodEnd).toLocaleDateString()}.
              </p>
            ) : null}
            <Link
              href="/pricing"
              className="btn-primary mt-5 inline-block rounded-md px-4 py-2 text-sm font-semibold"
            >
              {plan.priceCents > 0 ? "Change plan" : "Upgrade"}
            </Link>
          </section>

          <section className="hud p-6">
            <h2 className="text-chrome-dim text-xs font-bold tracking-[0.2em] font-label uppercase">
              Credits this period
            </h2>
            <p className="font-display text-chrome mt-2 text-3xl">
              {credits.remaining.toLocaleString()}
            </p>
            <p className="text-chrome-dim mt-1 text-sm">
              of {credits.granted.toLocaleString()} ·{" "}
              {credits.spent.toLocaleString()} used
            </p>
            <div
              className="bg-void/80 mt-4 h-2 overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={credits.spent}
              aria-valuemin={0}
              aria-valuemax={credits.granted}
              aria-label="Credits used this period"
            >
              <div
                className="from-crimson-600 to-crimson-400 h-full bg-gradient-to-r"
                style={{
                  width: `${credits.granted ? Math.min(100, (credits.spent / credits.granted) * 100) : 0}%`,
                }}
              />
            </div>
          </section>
        </div>

        <section className="hud mt-4 p-6">
          <h2 className="text-chrome-dim text-xs font-bold tracking-[0.2em] font-label uppercase">
            Details
          </h2>
          <dl className="text-chrome-dim mt-4 space-y-2 text-sm">
            <Row label="Name" value={user.displayName} />
            <Row label="Email" value={user.email} />
            <Row
              label="Member since"
              value={new Date(record.createdAt).toLocaleDateString()}
            />
            <Row
              label="Automatic sign out"
              value={`After ${Math.round(IDLE_TIMEOUT_MS / 60000)} minutes idle`}
            />
          </dl>
        </section>

        <section className="hud mt-4 p-6">
          <h2 className="text-chrome-dim text-xs font-bold tracking-[0.2em] font-label uppercase">
            Recent credit activity
          </h2>
          {recentSpend.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {recentSpend.map((entry) => (
                <li
                  key={entry.id}
                  className="border-edge/50 flex items-baseline justify-between gap-3 border-b pb-2 last:border-0"
                >
                  <span className="text-chrome-dim min-w-0 flex-1 truncate">
                    {entry.modelId ?? entry.reason}
                    <span className="text-chrome-faint ml-2 text-xs">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </span>
                  <span
                    className={
                      entry.delta < 0
                        ? "text-chrome font-semibold"
                        : "text-signal-green font-semibold"
                    }
                  >
                    {entry.delta > 0 ? "+" : ""}
                    {entry.delta}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-chrome-faint mt-3 text-sm">
              Nothing spent this period yet.
            </p>
          )}
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
