import Stripe from "stripe";
import { Plan } from "@prisma/client";

import { env } from "@/lib/env";
import { PLAN_LIMITS } from "@/lib/limits";

let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local.",
    );
  }
  if (_stripe) return _stripe;
  _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });
  return _stripe;
}

export function priceIdForPlan(plan: Plan): string | null {
  if (plan === "PRO") return env.STRIPE_PRO_PRICE_ID ?? null;
  if (plan === "AGENCY") return env.STRIPE_AGENCY_PRICE_ID ?? null;
  return null;
}

/**
 * Reverse lookup: given a Stripe priceId, return our internal Plan enum or null
 * if it doesn't match any configured plan.
 */
export function planForPriceId(priceId: string): Plan | null {
  if (priceId === env.STRIPE_PRO_PRICE_ID) return "PRO";
  if (priceId === env.STRIPE_AGENCY_PRICE_ID) return "AGENCY";
  return null;
}

export function creditsForPlan(plan: Plan): number {
  return PLAN_LIMITS[plan].creditsPerCycle;
}
