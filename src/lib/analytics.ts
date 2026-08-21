import "server-only";

import { createHash } from "node:crypto";
import type { DeviceKind } from "@/generated/prisma/enums";
import { db } from "./db";

/**
 * First-party analytics.
 *
 * No third-party script, no analytics cookie, no cross-site identifier. A
 * visitor is counted by `visitorHash` = SHA-256(ip + user-agent + daily salt).
 * Because the salt contains the UTC date, the same person produces a different
 * hash tomorrow, so the data supports "how many people came today" without ever
 * being a durable identifier or storing an IP address.
 *
 * Anything already recorded elsewhere - signups, generations, credit spend,
 * plans - is read from its own table by the dashboard rather than duplicated
 * into an events log that could disagree with it.
 */

/** Extra secret in the visitor hash so the values are not brute-forceable. */
function salt(): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${process.env.WEBHOOK_SECRET ?? "adamantite"}:${day}`;
}

export function visitorHash(ip: string | null, userAgent: string | null) {
  return createHash("sha256")
    .update(`${ip ?? "unknown"}|${userAgent ?? "unknown"}|${salt()}`)
    .digest("hex");
}

/*
 * Deliberately small UA matching rather than a parsing dependency. This feeds a
 * traffic breakdown, not device targeting, so the cost of a rare misattribution
 * is a slightly wrong row in a table.
 */
export function deviceFrom(ua: string | null): DeviceKind {
  if (!ua) return "DESKTOP";
  const s = ua.toLowerCase();
  if (/bot|crawler|spider|crawling|headless|lighthouse|preview/.test(s)) {
    return "BOT";
  }
  if (/ipad|tablet|playbook|silk/.test(s)) return "TABLET";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(s)) return "MOBILE";
  if (/android/.test(s)) return "TABLET";
  return "DESKTOP";
}

export function browserFrom(ua: string | null): string | null {
  if (!ua) return null;
  // Order matters: Edge and Opera both claim Chrome, Chrome claims Safari.
  const table: [RegExp, string][] = [
    [/edg[ea]?\//i, "Edge"],
    [/opr\/|opera/i, "Opera"],
    [/samsungbrowser/i, "Samsung Internet"],
    [/firefox\/|fxios/i, "Firefox"],
    [/chrome\/|crios/i, "Chrome"],
    [/safari\//i, "Safari"],
  ];
  for (const [re, name] of table) if (re.test(ua)) return name;
  return "Other";
}

export function osFrom(ua: string | null): string | null {
  if (!ua) return null;
  const table: [RegExp, string][] = [
    [/windows nt/i, "Windows"],
    [/iphone|ipad|ipod/i, "iOS"],
    [/mac os x/i, "macOS"],
    [/android/i, "Android"],
    [/cros/i, "ChromeOS"],
    [/linux/i, "Linux"],
  ];
  for (const [re, name] of table) if (re.test(ua)) return name;
  return "Other";
}

/**
 * Referrer reduced to a bare host. The full URL can carry search terms and
 * private path segments, and the dashboard only ever groups by source.
 */
export function referrerHost(
  referrer: string | null,
  selfOrigin: string,
): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (url.origin === selfOrigin) return null; // internal navigation
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Vercel resolves geo at the edge and forwards it as headers, so there is no
 * IP database to ship or query. Absent everywhere else, which is fine - the
 * dashboard just shows "Unknown".
 */
export function geoFrom(headers: Headers) {
  const dec = (v: string | null) => {
    if (!v) return null;
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  return {
    country: headers.get("x-vercel-ip-country"),
    region: headers.get("x-vercel-ip-country-region"),
    city: dec(headers.get("x-vercel-ip-city")),
  };
}

/** Only these are stored, so an arbitrary query string cannot fill the table. */
export function utmFrom(params: URLSearchParams) {
  const clamp = (v: string | null) => (v ? v.slice(0, 120) : null);
  return {
    utmSource: clamp(params.get("utm_source")),
    utmMedium: clamp(params.get("utm_medium")),
    utmCampaign: clamp(params.get("utm_campaign")),
  };
}

/**
 * Records a named funnel event. Never throws: analytics must not be able to
 * fail a sign-in or a checkout, so a write error is logged and swallowed.
 */
export async function track(
  name: string,
  opts: {
    userId?: string | null;
    clientId?: string | null;
    path?: string | null;
    meta?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    await db.analyticsEvent.create({
      data: {
        name,
        userId: opts.userId ?? null,
        clientId: opts.clientId ?? null,
        path: opts.path ?? null,
        meta: (opts.meta ?? undefined) as never,
      },
    });
  } catch (err) {
    console.error("analytics: failed to record event", name, err);
  }
}

/** Paths that are noise in a traffic report. */
export function isTrackablePath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  return !/^\/(api|_next|favicon|fonts|robots|sitemap)/.test(path);
}
