import { NextResponse } from "next/server";
import { HttpError, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStripeConfigured, priceIdFor, stripe } from "@/lib/stripe";
import { checkoutSchema } from "@/lib/validation";
import { appUrl } from "@/lib/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req: Request) => {
  const user = await requireUser();

  if (!isStripeConfigured()) {
    throw new HttpError(503, "Billing is not configured on this deployment");
  }

  const { plan } = checkoutSchema.parse(await req.json());

  const base = appUrl() ?? new URL(req.url).origin;
  const record = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { stripeCustomerId: true, email: true },
  });

  // Reuse the customer so a returning subscriber keeps one billing history
  // rather than accumulating a customer per checkout.
  let customerId = record.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: record.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    success_url: `${base}/account?checkout=success`,
    cancel_url: `${base}/pricing?checkout=canceled`,
    allow_promotion_codes: true,
    // Carried through to the webhook, which is the only place the plan is
    // actually granted. The client never gets to assert its own plan.
    subscription_data: { metadata: { userId: user.id, plan } },
    metadata: { userId: user.id, plan },
  });

  if (!session.url) throw new HttpError(502, "Stripe did not return a checkout URL");

  return NextResponse.json({ url: session.url });
});
