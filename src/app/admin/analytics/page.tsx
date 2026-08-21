import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { BarList, TrafficChart } from "@/components/analytics/Chart";
import { getCurrentUser } from "@/lib/auth";
import {
  buildReport,
  formatMoney,
  parseRange,
  RANGES,
  type RangeKey,
} from "@/lib/analytics-report";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

// Live numbers: never serve this from a cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  /*
   * Owner-only, enforced here rather than in middleware. The spec says only the
   * owner sees the analytics, and this page reads every account's data, so the
   * check sits directly in front of the query it guards.
   *
   * A non-owner gets /studio, not a 403: telling a signed-in stranger that this
   * URL exists and is merely forbidden is more than they need to know.
   */
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/analytics");
  if (user.role !== "OWNER") redirect("/studio");

  const range: RangeKey = parseRange((await searchParams).range);
  const report = await buildReport(range);

  const { traffic, audience, product } = report;
  const delta =
    traffic.previousVisitors && traffic.previousVisitors > 0
      ? ((traffic.visitors - traffic.previousVisitors) /
          traffic.previousVisitors) *
        100
      : null;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-crimson-400 font-label text-xs font-bold tracking-[0.25em] uppercase">
              Owner only
            </p>
            <h1 className="font-display text-chrome mt-2 text-4xl">Analytics</h1>
            <p className="text-chrome-dim mt-2 text-sm">
              Live, first-party, and nobody but you can load this page.
            </p>
          </div>

          <nav aria-label="Date range" className="flex gap-1.5">
            {(Object.keys(RANGES) as RangeKey[]).map((key) => (
              <Link
                key={key}
                href={`/admin/analytics?range=${key}`}
                aria-current={key === range ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  key === range
                    ? "btn-primary"
                    : "btn-ghost text-chrome-dim hover:text-chrome"
                }`}
              >
                {RANGES[key].label}
              </Link>
            ))}
          </nav>
        </div>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Unique visitors"
            value={traffic.visitors.toLocaleString()}
            delta={delta}
          />
          <Stat label="Page views" value={traffic.views.toLocaleString()} />
          <Stat
            label="Bounce rate"
            value={
              traffic.bounceRate === null
                ? "—"
                : `${traffic.bounceRate.toFixed(0)}%`
            }
            hint="Visits that read one page"
          />
          <Stat
            label="Avg. time on page"
            value={
              traffic.avgSeconds === null
                ? "—"
                : `${Math.floor(traffic.avgSeconds / 60)}m ${Math.round(
                    traffic.avgSeconds % 60,
                  )}s`
            }
          />
        </section>

        <Panel title="Traffic" className="mt-4">
          <TrafficChart series={report.series} />
        </Panel>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Top pages">
            <BarList rows={report.topPages} empty="No page views yet." />
          </Panel>
          <Panel title="Referrers">
            <BarList rows={report.referrers} empty="No traffic sources yet." />
          </Panel>
          <Panel title="Countries">
            <BarList
              rows={report.countries}
              empty="Geo needs the Vercel deployment; localhost sends no country header."
            />
          </Panel>
          <Panel title="Devices and browsers">
            <div className="grid gap-4 sm:grid-cols-2">
              <BarList rows={report.devices} empty="No devices yet." />
              <BarList rows={report.browsers} empty="No browsers yet." />
            </div>
          </Panel>
        </section>

        {report.campaigns.length > 0 ? (
          <Panel title="Campaigns" className="mt-4">
            <BarList rows={report.campaigns} empty="No tagged campaigns." />
          </Panel>
        ) : null}

        <h2 className="font-display text-chrome mt-12 text-2xl">Audience</h2>
        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total accounts" value={audience.totalUsers.toLocaleString()} />
          <Stat
            label={`New in ${RANGES[range].label}`}
            value={audience.newUsers.toLocaleString()}
          />
          <Stat
            label="Active right now"
            value={audience.activeNow.toLocaleString()}
            live={audience.activeNow > 0}
          />
          <Stat
            label="Monthly recurring revenue"
            value={formatMoney(audience.mrrCents)}
          />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Accounts by plan">
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-chrome-faint border-edge/70 font-label border-b text-xs tracking-wider uppercase">
                  <th className="py-2 text-left font-semibold">Plan</th>
                  <th className="py-2 text-right font-semibold">Accounts</th>
                  <th className="py-2 text-right font-semibold">MRR</th>
                </tr>
              </thead>
              <tbody>
                {audience.byPlan.map((row) => (
                  <tr key={row.plan} className="border-edge/40 border-b last:border-0">
                    <td className="text-chrome py-2">{row.plan}</td>
                    <td className="text-chrome-dim py-2 text-right tabular-nums">
                      {row.count.toLocaleString()}
                    </td>
                    <td className="text-chrome-dim py-2 text-right tabular-nums">
                      {formatMoney(row.mrrCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Conversion funnel">
            <ul className="mt-3 space-y-2">
              {report.funnel.map((step, i) => {
                const first = report.funnel[0]!.count || 1;
                const pct = (step.count / first) * 100;
                return (
                  <li key={step.label}>
                    <div className="text-chrome-dim mb-1 flex justify-between text-xs">
                      <span>{step.label}</span>
                      <span className="tabular-nums">
                        {step.count.toLocaleString()}
                        {i > 0 ? ` · ${pct.toFixed(1)}%` : ""}
                      </span>
                    </div>
                    <div className="bg-edge/60 h-2 w-full rounded-sm">
                      <div
                        className="bg-crimson-500 h-2 rounded-sm"
                        style={{ width: `${Math.max(1, Math.min(100, pct))}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </section>

        <h2 className="font-display text-chrome mt-12 text-2xl">Generation</h2>
        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Generations" value={product.generations.toLocaleString()} />
          <Stat label="Succeeded" value={product.succeeded.toLocaleString()} />
          <Stat label="Failed" value={product.failed.toLocaleString()} />
          <Stat
            label="Credits spent"
            value={product.creditsSpent.toLocaleString()}
          />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Most used models">
            <BarList rows={product.topModels} empty="Nothing generated yet." />
          </Panel>

          <Panel title="Newest accounts">
            {report.recentSignups.length === 0 ? (
              <p className="text-chrome-faint py-6 text-sm">
                No signups in this range.
              </p>
            ) : (
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-chrome-faint border-edge/70 font-label border-b text-xs tracking-wider uppercase">
                    <th className="py-2 text-left font-semibold">Account</th>
                    <th className="py-2 text-left font-semibold">Via</th>
                    <th className="py-2 text-right font-semibold">Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recentSignups.map((u) => (
                    <tr key={u.id} className="border-edge/40 border-b last:border-0">
                      <td className="py-2">
                        <span className="text-chrome block">{u.displayName}</span>
                        <span className="text-chrome-faint block text-xs">
                          {u.email}
                        </span>
                      </td>
                      <td className="text-chrome-dim py-2">{u.method}</td>
                      <td className="text-chrome-dim py-2 text-right">{u.plan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </section>

        <p className="text-chrome-faint mt-10 text-xs leading-relaxed">
          Visitors are counted by a daily-rotating hash of IP and user agent, so
          no address is stored and yesterday&apos;s hashes cannot be matched to
          today&apos;s. No cookies, no third-party script. Country, region and
          city come from Vercel&apos;s edge headers and are blank on localhost.{" "}
          <Link href="/admin" className="text-crimson-400 hover:text-crimson-300">
            Account console
          </Link>
          .
        </p>
      </main>

      <SiteFooter />
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  delta,
  live,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  live?: boolean;
}) {
  return (
    <div className="hud p-5">
      <p className="text-chrome-faint font-label text-xs font-bold tracking-[0.2em] uppercase">
        {label}
      </p>
      <p className="font-display text-chrome mt-2 flex items-center gap-2 text-3xl">
        {value}
        {live ? (
          <span
            aria-label="currently active"
            className="bg-signal-green animate-pulse-glow inline-block h-2.5 w-2.5 rounded-full"
          />
        ) : null}
      </p>
      {delta !== null && delta !== undefined ? (
        <p
          className={`mt-1 text-xs font-semibold ${
            delta >= 0 ? "text-signal-green" : "text-crimson-400"
          }`}
        >
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs previous
        </p>
      ) : null}
      {hint ? <p className="text-chrome-faint mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`hud p-5 ${className}`}>
      <h2 className="text-chrome-dim font-label text-xs font-bold tracking-[0.2em] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
