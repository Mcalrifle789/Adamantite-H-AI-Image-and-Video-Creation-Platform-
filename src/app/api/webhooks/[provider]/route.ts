import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { db } from "@/lib/db";
import { settleGeneration } from "@/lib/generations";
import { safeEqual } from "@/lib/auth";
import { webhookToken } from "@/lib/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ provider: string }> };

/**
 * Provider completion callback.
 *
 * The body is treated purely as a hint that "job X changed"; the outcome is
 * never read from it. settleGeneration re-fetches the status over the
 * authenticated API, so a forged POST can at worst cause one redundant status
 * read. Higgsfield sends no signature, which is what makes that necessary.
 *
 * Always answers 2xx for a well-formed body, including duplicates, because a
 * 4xx is treated as permanent and stops retries.
 */
export const POST = route(async (req: Request, ctx: Ctx) => {
  const { provider } = await ctx.params;

  const expected = webhookToken(provider);
  const supplied = new URL(req.url).searchParams.get("token");
  if (!expected || !supplied || !safeEqual(expected, supplied)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    request_id?: string;
  } | null;

  const jobId = body?.request_id;
  if (!jobId) {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  const generation = await db.generation.findFirst({
    where: { providerJobId: jobId, providerId: provider },
    select: { id: true },
  });

  // Unknown job: acknowledge so the provider stops retrying something we will
  // never be able to match.
  if (!generation) return NextResponse.json({ ok: true });

  try {
    await settleGeneration(generation.id);
  } catch (err) {
    // A 5xx asks the provider to retry, which is the right outcome when our own
    // status read failed rather than the payload being bad.
    console.error("Webhook settle failed:", err);
    return NextResponse.json({ error: "Retry later" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
});
