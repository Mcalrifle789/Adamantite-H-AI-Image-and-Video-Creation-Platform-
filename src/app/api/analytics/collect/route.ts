import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  browserFrom,
  deviceFrom,
  geoFrom,
  isTrackablePath,
  osFrom,
  referrerHost,
  utmFrom,
  visitorHash,
} from "@/lib/analytics";

export const runtime = "nodejs";

const bodySchema = z.object({
  // Path only. A full URL would let a caller attribute traffic to another site.
  path: z.string().min(1).max(512),
  referrer: z.string().max(2048).optional().nullable(),
  query: z.string().max(2048).optional().nullable(),
  clientId: z.string().min(8).max(64),
  /** Set on the closing beacon to finalise time-on-page. */
  viewId: z.string().min(8).max(64).optional(),
  durationMs: z.number().int().min(0).max(6 * 60 * 60 * 1000).optional(),
});

/**
 * Ingests one page view, or finalises an earlier one with its duration.
 *
 * Everything that can be derived server-side - IP, user agent, geo, signed-in
 * user - is taken from the request rather than trusted from the body, so a
 * hand-rolled POST cannot forge a country or attribute a view to someone else.
 */
export const POST = route(async (req: Request) => {
  const body = bodySchema.parse(await req.json());

  if (!isTrackablePath(body.path)) {
    return NextResponse.json({ ok: true });
  }

  // Closing beacon: attach the duration to the view it belongs to.
  if (body.viewId && typeof body.durationMs === "number") {
    await db.pageView.updateMany({
      // Scoped by clientId so one visitor cannot write durations onto another's
      // rows by guessing an id.
      where: { id: body.viewId, clientId: body.clientId, durationMs: null },
      data: { durationMs: body.durationMs },
    });
    return NextResponse.json({ ok: true });
  }

  const ua = req.headers.get("user-agent");
  const device = deviceFrom(ua);

  // Crawlers would swamp the visitor counts and none of it is a real person.
  if (device === "BOT") {
    return NextResponse.json({ ok: true, ignored: "bot" });
  }

  const user = await getCurrentUser();
  const origin = new URL(req.url).origin;
  const params = new URLSearchParams(body.query ?? "");
  const geo = geoFrom(req.headers);

  const view = await db.pageView.create({
    data: {
      path: body.path.slice(0, 512),
      referrerHost: referrerHost(body.referrer ?? null, origin),
      visitorHash: visitorHash(clientIp(req), ua),
      clientId: body.clientId,
      userId: user?.id ?? null,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      device,
      browser: browserFrom(ua),
      os: osFrom(ua),
      ...utmFrom(params),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, viewId: view.id });
});
