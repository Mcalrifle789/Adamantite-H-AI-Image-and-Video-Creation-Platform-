import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { planForPriceId, stripe } from "@/lib/stripe";
import type { PlanId, SubscriptionStatus } from "@/generated/prisma/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook. This is the only place a plan is ever granted.
 *
 * Unlike the provider webhook, Stripe signs its deliveries, so the signature is
 * verified against the raw body and the parsed event is then trusted. Events
 * are recorded in ProcessedWebhookEvent first, so a redelivery cannot re-run a
 * period reset and hand out a second month of credits.
 */

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    default:
      return "INCOMPLETE";
  }
}

async function applySubscription(sub: Stripe.Subscription) {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const user = await db.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true, periodStart: true },
  });
  if (!user) {
    console.warn(`Stripe subscription for unknown customer ${customerId}`);
    return;
  }

  const item = sub.items.data[0];
  const priceId = item?.price?.id;
  const plan: PlanId =
    (priceId ? planForPriceId(priceId) : null) ??
    ((sub.metadata?.plan as PlanId | undefined) ?? "FREE");

  const status = mapStatus(sub.status);

  // Stripe's period bounds are the source of truth for the metering window, so
  // credits reset exactly when the customer is billed.
  const periodStart = item?.current_period_start
    ? new Date(item.current_period_start * 1000)
    : user.periodStart;
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  await db.user.update({
    where: { id: user.id },
    data: {
      plan: status === "CANCELED" ? "FREE" : plan,
      subscriptionStatus: status,
      stripeSubId: sub.id,
      periodStart,
      periodEnd,
    },
  });
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 400 });
  }

  // Must be the raw body: any reserialisation invalidates the signature.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(raw, signature, secret);
  } catch (err) {
    console.warn("Rejected Stripe webhook:", err);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  // Idempotency: a duplicate delivery short-circuits on the unique id.
  try {
    await db.processedWebhookEvent.create({ data: { id: event.id } });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await applySubscription(event.data.object);
        break;

      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          await applySubscription(await stripe().subscriptions.retrieve(subId));
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        if (customerId) {
          await db.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { subscriptionStatus: "PAST_DUE" },
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // Roll back the idempotency marker so Stripe's retry can have another go.
    await db.processedWebhookEvent
      .delete({ where: { id: event.id } })
      .catch(() => undefined);
    console.error(`Failed handling ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
