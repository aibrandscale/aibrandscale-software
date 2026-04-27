import type { Plan, SubscriptionStatus } from "@prisma/client";

export type PlanLimits = {
  creditsPerCycle: number;
  brands: number;
  members: number;
  productsPerBrand: number;
  priceCents: number;
  label: string;
};

export const PLAN_LIMITS: Record<"TRIAL" | Plan, PlanLimits> = {
  TRIAL: {
    creditsPerCycle: 50,
    brands: 1,
    members: 1,
    productsPerBrand: 5,
    priceCents: 0,
    label: "Trial",
  },
  PRO: {
    creditsPerCycle: 1500,
    brands: 10,
    members: 10,
    productsPerBrand: 50,
    priceCents: 12_900, // $129
    label: "Pro",
  },
  AGENCY: {
    creditsPerCycle: 5000,
    brands: 30,
    members: 30,
    productsPerBrand: 100,
    priceCents: 29_900, // $299
    label: "Agency",
  },
};

export function getLimitsForSubscription(sub: {
  plan: Plan | null;
  status: SubscriptionStatus;
}): PlanLimits {
  if (sub.status === "TRIALING" || !sub.plan) return PLAN_LIMITS.TRIAL;
  return PLAN_LIMITS[sub.plan];
}

export const SUPPORTED_LANGUAGES = [
  "Bulgarian",
  "Romanian",
  "English",
  "Greek",
  "Hungarian",
  "Czech",
  "Slovak",
  "Polish",
  "Serbian",
  "Croatian",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
