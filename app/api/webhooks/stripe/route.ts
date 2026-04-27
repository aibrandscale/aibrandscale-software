import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { Plan, SubscriptionStatus } from "@prisma/client";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { stripe, planForPriceId, creditsForPlan } from "@/lib/stripe";
import { resetCreditsTo } from "@/lib/credits";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  switch (s) {
    case "active":
    case "trialing":
      return s === "trialing" ? "TRIALING" : "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "unpaid":
      return "CANCELED";
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "INCOMPLETE";
    default:
      return "INCOMPLETE";
  }
}

async function alreadyProcessed(eventId: string, type: string): Promise<boolean> {
  try {
    await prisma.processedStripeEvent.create({
      data: { eventId, type },
    });
    return false;
  } catch {
    // Unique violation on eventId → already processed.
    return true;
  }
}

async function findWorkspaceIdForCustomer(
  customerId: string,
): Promise<string | null> {
  const sub = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { workspaceId: true },
  });
  return sub?.workspaceId ?? null;
}

async function syncSubscriptionFromStripe(
  workspaceId: string,
  sub: Stripe.Subscription,
): Promise<{ planChanged: boolean; plan: Plan | null }> {
  const item = sub.items.data[0];
  const priceId = item?.price.id ?? null;
  const plan = priceId ? planForPriceId(priceId) : null;
  const status = mapStatus(sub.status);
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  const before = await prisma.subscription.findUnique({
    where: { workspaceId },
    select: { plan: true, creditsPerCycle: true },
  });

  await prisma.subscription.update({
    where: { workspaceId },
    data: {
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      plan,
      status,
      currentPeriodEnd: periodEnd,
      cycleAnchor: periodEnd,
      creditsPerCycle: plan ? creditsForPlan(plan) : (before?.creditsPerCycle ?? 50),
    },
  });

  return { planChanged: before?.plan !== plan, plan };
}

export async function POST(req: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not set" },
      { status: 500 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      rawBody,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    log.warn("stripe.webhook.bad_signature", { err });
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  if (await alreadyProcessed(event.id, event.type)) {
    return NextResponse.json({ received: true, deduped: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId =
          (session.client_reference_id as string | null) ??
          (session.metadata?.workspaceId as string | undefined) ??
          null;
        if (!workspaceId) break;
        if (typeof session.subscription !== "string") break;

        const sub = await stripe().subscriptions.retrieve(session.subscription);
        const { plan } = await syncSubscriptionFromStripe(workspaceId, sub);
        if (plan) {
          await resetCreditsTo(workspaceId, creditsForPlan(plan));
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const workspaceId = await findWorkspaceIdForCustomer(customerId);
        if (!workspaceId) break;
        await syncSubscriptionFromStripe(workspaceId, sub);
        // Note: we do NOT refill credits here — only on invoice.paid for the
        // start of a new billing cycle. Plan changes mid-cycle keep the
        // current balance; the new cycle's allowance applies on next renewal.
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const workspaceId = await findWorkspaceIdForCustomer(customerId);
        if (!workspaceId) break;
        await prisma.subscription.update({
          where: { workspaceId },
          data: { status: "CANCELED" },
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (
          invoice.billing_reason !== "subscription_create" &&
          invoice.billing_reason !== "subscription_cycle" &&
          invoice.billing_reason !== "subscription_update"
        ) {
          break;
        }
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? null;
        if (!customerId) break;
        const workspaceId = await findWorkspaceIdForCustomer(customerId);
        if (!workspaceId) break;

        const rawPrice = invoice.lines.data[0]?.pricing?.price_details?.price;
        const priceId =
          typeof rawPrice === "string" ? rawPrice : (rawPrice?.id ?? null);
        const plan = priceId ? planForPriceId(priceId) : null;
        if (!plan) break;

        // Cycle reset — credits do NOT roll over per spec.
        await resetCreditsTo(workspaceId, creditsForPlan(plan));
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? null;
        if (!customerId) break;
        const workspaceId = await findWorkspaceIdForCustomer(customerId);
        if (!workspaceId) break;
        await prisma.subscription.update({
          where: { workspaceId },
          data: { status: "PAST_DUE" },
        });
        break;
      }

      default:
        // Logged but acknowledged; Stripe will not retry.
        break;
    }
  } catch (err) {
    log.error("stripe.webhook.handler_error", { type: event.type, err });
    // Return 500 so Stripe retries. The idempotency row was already inserted,
    // so we delete it on failure to allow re-entry.
    await prisma.processedStripeEvent
      .delete({ where: { eventId: event.id } })
      .catch(() => undefined);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
