"use server";

import { redirect } from "next/navigation";
import type { Plan } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { stripe, priceIdForPlan } from "@/lib/stripe";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { canManageBilling } from "@/lib/permissions";
import { env } from "@/lib/env";

const APP_URL = env.NEXTAUTH_URL.replace(/\/$/, "");

async function getOrCreateCustomerId(
  workspaceId: string,
  email: string,
  workspaceName: string,
): Promise<string> {
  const existing = await prisma.subscription.findUnique({
    where: { workspaceId },
    select: { stripeCustomerId: true },
  });
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const customer = await stripe().customers.create({
    email,
    name: workspaceName,
    metadata: { workspaceId },
  });

  await prisma.subscription.upsert({
    where: { workspaceId },
    update: { stripeCustomerId: customer.id },
    create: {
      workspaceId,
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

export async function createCheckoutSession(
  formData: FormData,
): Promise<void> {
  const ws = await getActiveWorkspace();
  if (!canManageBilling(ws.role)) {
    throw new Error("Only the workspace owner can manage billing.");
  }

  const planRaw = String(formData.get("plan") ?? "");
  if (planRaw !== "PRO" && planRaw !== "AGENCY") {
    throw new Error("Invalid plan.");
  }
  const plan = planRaw as Plan;

  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    throw new Error(
      `Stripe price ID not configured for plan ${plan}. Set STRIPE_${plan}_PRICE_ID.`,
    );
  }

  const customerId = await getOrCreateCustomerId(
    ws.id,
    ws.userEmail,
    ws.name,
  );

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: ws.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/subscription?checkout=success`,
    cancel_url: `${APP_URL}/subscription?checkout=cancel`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { workspaceId: ws.id, plan },
    },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  redirect(session.url);
}

export async function createPortalSession(): Promise<void> {
  const ws = await getActiveWorkspace();
  if (!canManageBilling(ws.role)) {
    throw new Error("Only the workspace owner can manage billing.");
  }

  const sub = await prisma.subscription.findUnique({
    where: { workspaceId: ws.id },
    select: { stripeCustomerId: true },
  });
  if (!sub?.stripeCustomerId) {
    throw new Error("No Stripe customer yet. Subscribe first.");
  }

  const portal = await stripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${APP_URL}/subscription`,
  });

  redirect(portal.url);
}
