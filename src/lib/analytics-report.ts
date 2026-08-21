import "server-only";

import { db } from "./db";
import { activeSessionWhere } from "./auth";
import { PLANS } from "./plans";

/**
 * Read model behind the owner analytics console.
 *
 * Traffic comes from PageView; everything about the business - accounts, plans,
 * generations, credit spend - is read from the tables that already own it, so
 * the dashboard cannot drift from what the app actually did.
 *
 * The daily series and the top-N breakdowns are raw SQL. Prisma's groupBy
 * cannot date-truncate, and doing it in JavaScript would mean pulling every row
 * in the range into memory to bucket it.
 */

export const RANGES = {
  "24h": { label: "24 hours", days: 1 },
  "7d": { label: "7 days", days: 7 },
  "30d": { label: "30 days", days: 30 },
  "90d": { label: "90 days", days: 90 },
} as const;

export type RangeKey = keyof typeof RANGES;

export function parseRange(value: string | undefined): RangeKey {
  return value && value in RANGES ? (value as RangeKey) : "30d";
}

export interface Point {
  day: string;
  visitors: number;
  views: number;
}

export interface Row {
  label: string;
  count: number;
}

export interface Report {
  range: RangeKey;
  since: Date;
  traffic: {
    visitors: number;
    views: number;
    /** Share of visits that were a single page view, as a percentage. */
    bounceRate: number | null;
    avgSeconds: number | null;
    /** Same window, immediately before `since`. Null when there is no data. */
    previousVisitors: number | null;
  };
  series: Point[];
  topPages: Row[];
  referrers: Row[];
  countries: Row[];
  devices: Row[];
  browsers: Row[];
  campaigns: Row[];
  audience: {
    totalUsers: number;
    newUsers: number;
    activeNow: number;
    byPlan: { plan: string; count: number; mrrCents: number }[];
    mrrCents: number;
  };
  product: {
    generations: number;
    succeeded: number;
    failed: number;
    creditsSpent: number;
    topModels: Row[];
  };
  funnel: { label: string; count: number }[];
  recentSignups: {
    id: string;
    email: string;
    displayName: string;
    plan: string;
    createdAt: Date;
    method: string;
  }[];
}

function startOf(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Raw rows come back with bigint counts; the UI wants numbers. */
function toRows(raw: { label: string | null; count: bigint | number }[]): Row[] {
  return raw.map((r) => ({
    label: r.label?.trim() || "Unknown",
    count: Number(r.count),
  }));
}

export async function buildReport(range: RangeKey): Promise<Report> {
  const { days } = RANGES[range];
  const since = startOf(days);
  const prevSince = startOf(days * 2);

  const [
    visitorAgg,
    views,
    previousVisitorAgg,
    series,
    topPages,
    referrers,
    countries,
    devices,
    browsers,
    campaigns,
    durationAgg,
    bounceAgg,
    totalUsers,
    newUsers,
    activeSessions,
    planGroups,
    generationGroups,
    creditsAgg,
    topModels,
    recentSignups,
    signupEvents,
  ] = await Promise.all([
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "visitorHash") AS count
      FROM "PageView" WHERE "createdAt" >= ${since}`,
    db.pageView.count({ where: { createdAt: { gte: since } } }),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "visitorHash") AS count
      FROM "PageView"
      WHERE "createdAt" >= ${prevSince} AND "createdAt" < ${since}`,
    db.$queryRaw<{ day: Date; visitors: bigint; views: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day,
             COUNT(DISTINCT "visitorHash") AS visitors,
             COUNT(*) AS views
      FROM "PageView" WHERE "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 1 ASC`,
    db.$queryRaw<{ label: string; count: bigint }[]>`
      SELECT "path" AS label, COUNT(*) AS count
      FROM "PageView" WHERE "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
    db.$queryRaw<{ label: string; count: bigint }[]>`
      SELECT COALESCE("referrerHost", 'Direct') AS label, COUNT(*) AS count
      FROM "PageView" WHERE "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
    db.$queryRaw<{ label: string; count: bigint }[]>`
      SELECT COALESCE("country", 'Unknown') AS label,
             COUNT(DISTINCT "visitorHash") AS count
      FROM "PageView" WHERE "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
    db.$queryRaw<{ label: string; count: bigint }[]>`
      SELECT "device"::text AS label, COUNT(DISTINCT "visitorHash") AS count
      FROM "PageView" WHERE "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<{ label: string; count: bigint }[]>`
      SELECT COALESCE("browser", 'Unknown') AS label,
             COUNT(DISTINCT "visitorHash") AS count
      FROM "PageView" WHERE "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
    db.$queryRaw<{ label: string; count: bigint }[]>`
      SELECT "utmSource" AS label, COUNT(*) AS count
      FROM "PageView"
      WHERE "createdAt" >= ${since} AND "utmSource" IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
    db.$queryRaw<{ avg: number | null }[]>`
      SELECT AVG("durationMs") AS avg
      FROM "PageView"
      WHERE "createdAt" >= ${since} AND "durationMs" IS NOT NULL`,
    // A visit is one clientId. Single-page visits are bounces.
    db.$queryRaw<{ total: bigint; bounced: bigint }[]>`
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE views = 1) AS bounced
      FROM (
        SELECT "clientId", COUNT(*) AS views
        FROM "PageView"
        WHERE "createdAt" >= ${since} AND "clientId" IS NOT NULL
        GROUP BY "clientId"
      ) visits`,
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.session.findMany({
      where: activeSessionWhere(),
      select: { userId: true },
      distinct: ["userId"],
    }),
    db.user.groupBy({ by: ["plan"], _count: { _all: true } }),
    db.generation.groupBy({
      by: ["status"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    db.usageEntry.aggregate({
      where: { createdAt: { gte: since }, delta: { lt: 0 } },
      _sum: { delta: true },
    }),
    db.$queryRaw<{ label: string; count: bigint }[]>`
      SELECT "modelId" AS label, COUNT(*) AS count
      FROM "Generation" WHERE "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
    db.user.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        email: true,
        displayName: true,
        plan: true,
        createdAt: true,
        passwordHash: true,
        accounts: { select: { provider: true }, take: 1 },
      },
    }),
    db.analyticsEvent.count({
      where: { name: "signup", createdAt: { gte: since } },
    }),
  ]);

  const visitors = Number(visitorAgg[0]?.count ?? 0);
  const previousVisitors = Number(previousVisitorAgg[0]?.count ?? 0);

  const bounceTotal = Number(bounceAgg[0]?.total ?? 0);
  const bounced = Number(bounceAgg[0]?.bounced ?? 0);

  const byPlan = planGroups
    .map((g) => {
      const plan = PLANS[g.plan];
      const count = g._count._all;
      const priceCents = plan?.priceCents ?? 0;
      return {
        plan: plan?.name ?? g.plan,
        count,
        mrrCents: priceCents * count,
      };
    })
    .sort((a, b) => b.mrrCents - a.mrrCents || b.count - a.count);

  const paidUsers = planGroups
    .filter((g) => g.plan !== "FREE")
    .reduce((n, g) => n + g._count._all, 0);

  const statusCount = (s: string) =>
    generationGroups.find((g) => g.status === s)?._count._all ?? 0;

  return {
    range,
    since,
    traffic: {
      visitors,
      views,
      bounceRate: bounceTotal ? (bounced / bounceTotal) * 100 : null,
      avgSeconds: durationAgg[0]?.avg ? Number(durationAgg[0].avg) / 1000 : null,
      previousVisitors: previousVisitors || null,
    },
    series: series.map((p) => ({
      day: p.day.toISOString().slice(0, 10),
      visitors: Number(p.visitors),
      views: Number(p.views),
    })),
    topPages: toRows(topPages),
    referrers: toRows(referrers),
    countries: toRows(countries),
    devices: toRows(devices),
    browsers: toRows(browsers),
    campaigns: toRows(campaigns),
    audience: {
      totalUsers,
      newUsers,
      activeNow: activeSessions.length,
      byPlan,
      mrrCents: byPlan.reduce((n, p) => n + p.mrrCents, 0),
    },
    product: {
      generations: generationGroups.reduce((n, g) => n + g._count._all, 0),
      succeeded: statusCount("SUCCEEDED"),
      failed: statusCount("FAILED"),
      creditsSpent: Math.abs(creditsAgg._sum.delta ?? 0),
      topModels: toRows(topModels),
    },
    funnel: [
      { label: "Visitors", count: visitors },
      // Falls back to the User table when the event log predates a signup.
      { label: "Signed up", count: Math.max(newUsers, signupEvents) },
      { label: "On a paid plan", count: paidUsers },
    ],
    recentSignups: recentSignups.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      plan: PLANS[u.plan]?.name ?? u.plan,
      createdAt: u.createdAt,
      method: u.accounts[0]
        ? u.accounts[0].provider === "GOOGLE"
          ? "Google"
          : "Microsoft"
        : u.passwordHash
          ? "Password"
          : "Unknown",
    })),
  };
}

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
