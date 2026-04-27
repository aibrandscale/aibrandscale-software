import { CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import type { UsageEventKind } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { PLAN_LIMITS, getLimitsForSubscription } from "@/lib/limits";
import { canManageBilling } from "@/lib/permissions";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  createCheckoutSession,
  createPortalSession,
} from "@/app/actions/billing";

export const metadata = { title: "Subscription — AI BrandScale" };

export default async function SubscriptionPage() {
  const ws = await getActiveWorkspace();

  const sub = await prisma.subscription.findUnique({
    where: { workspaceId: ws.id },
  });
  const [brandCount, memberCount, usageEvents] = await Promise.all([
    prisma.brand.count({ where: { workspaceId: ws.id } }),
    prisma.workspaceMember.count({ where: { workspaceId: ws.id } }),
    prisma.usageEvent.findMany({
      where: { workspaceId: ws.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  const limits = sub
    ? getLimitsForSubscription(sub)
    : PLAN_LIMITS.TRIAL;
  const isTrial = !sub?.plan || sub.status === "TRIALING";
  const isActive = sub?.status === "ACTIVE";
  const isPastDue = sub?.status === "PAST_DUE";
  const isCanceled = sub?.status === "CANCELED";

  const creditsRemaining = sub?.creditsRemaining ?? 0;
  const creditsTotal = sub?.creditsPerCycle ?? limits.creditsPerCycle;

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const ownerCanManage = canManageBilling(ws.role);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Subscription"
        description="Plan, credits, and billing."
      />

      {isPastDue && (
        <Banner
          tone="warning"
          icon={<AlertCircle className="size-4" />}
          title="Payment failed"
          body="Your last invoice was not paid. Update your payment method to keep your subscription active."
        />
      )}
      {isCanceled && (
        <Banner
          tone="error"
          icon={<AlertCircle className="size-4" />}
          title="Subscription canceled"
          body="Resubscribe below to continue generating content."
        />
      )}

      {/* Current plan */}
      <section className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Current plan
            </span>
            <h2 className="text-2xl font-semibold tracking-tight">
              {limits.label}
              {limits.priceCents > 0 && (
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  {formatPrice(limits.priceCents, "USD")} / month
                </span>
              )}
            </h2>
          </div>
          <StatusBadge
            isTrial={isTrial}
            isActive={isActive}
            isPastDue={isPastDue}
            isCanceled={isCanceled}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <UsageStat
            label="Credits"
            value={`${creditsRemaining} / ${creditsTotal}`}
            percent={
              creditsTotal > 0 ? (creditsRemaining / creditsTotal) * 100 : 0
            }
          />
          <UsageStat
            label="Brands"
            value={`${brandCount} / ${limits.brands}`}
            percent={(brandCount / limits.brands) * 100}
          />
          <UsageStat
            label="Members"
            value={`${memberCount} / ${limits.members}`}
            percent={(memberCount / limits.members) * 100}
          />
        </div>

        {sub?.currentPeriodEnd && (
          <div className="text-xs text-muted-foreground">
            {isCanceled
              ? `Access until ${dateFmt.format(sub.currentPeriodEnd)}`
              : `Renews ${dateFmt.format(sub.currentPeriodEnd)} · credits reset on renewal`}
          </div>
        )}
      </section>

      {/* Plan options */}
      {ownerCanManage && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Plans
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <PlanCard
              plan="PRO"
              isCurrent={sub?.plan === "PRO"}
            />
            <PlanCard
              plan="AGENCY"
              isCurrent={sub?.plan === "AGENCY"}
            />
          </div>
        </section>
      )}

      {/* Billing portal */}
      {ownerCanManage && sub?.stripeCustomerId && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Billing & invoices
          </h2>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Stripe customer portal</span>
              <span className="text-xs text-muted-foreground">
                Manage payment method, view invoices, change or cancel plan.
              </span>
            </div>
            <form action={createPortalSession}>
              <Button type="submit" variant="outline">
                Open portal <ExternalLink className="size-4" />
              </Button>
            </form>
          </div>
        </section>
      )}

      {!ownerCanManage && (
        <p className="text-xs text-muted-foreground">
          Only the workspace owner can manage billing.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Recent activity
        </h2>
        {usageEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-muted-foreground">
            No activity yet.
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-white/5 rounded-xl border border-white/10 bg-white/5">
            {usageEvents.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm">{kindLabel(e.kind)}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(e.createdAt)}
                    {e.note ? ` · ${e.note}` : ""}
                  </span>
                </div>
                <span
                  className={`text-sm font-medium ${
                    e.creditsDelta < 0 ? "text-error" : "text-success"
                  }`}
                >
                  {e.creditsDelta > 0 ? "+" : ""}
                  {e.creditsDelta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function kindLabel(kind: UsageEventKind): string {
  switch (kind) {
    case "GENERATION_CHARGE":
      return "Generation";
    case "GENERATION_REFUND":
      return "Refund";
    case "CYCLE_REFILL":
      return "Cycle refill";
    case "TRIAL_GRANT":
      return "Trial credits";
    case "ADMIN_ADJUSTMENT":
      return "Admin adjustment";
  }
}

function StatusBadge({
  isTrial,
  isActive,
  isPastDue,
  isCanceled,
}: {
  isTrial: boolean;
  isActive: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
}) {
  if (isCanceled) return <Badge variant="destructive">Canceled</Badge>;
  if (isPastDue) return <Badge variant="destructive">Past due</Badge>;
  if (isActive)
    return (
      <Badge className="bg-success/15 text-success">
        <CheckCircle2 className="size-3" /> Active
      </Badge>
    );
  if (isTrial) return <Badge variant="secondary">Trial</Badge>;
  return <Badge variant="secondary">Inactive</Badge>;
}

function UsageStat({
  label,
  value,
  percent,
}: {
  label: string;
  value: string;
  percent: number;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <Progress value={clamped} className="h-1.5" />
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
}: {
  plan: "PRO" | "AGENCY";
  isCurrent: boolean;
}) {
  const limits = PLAN_LIMITS[plan];
  return (
    <div
      className={`flex flex-col gap-4 rounded-xl border p-5 ${
        isCurrent
          ? "border-brand bg-brand/5"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">{limits.label}</h3>
        <span className="text-sm text-muted-foreground">
          {formatPrice(limits.priceCents, "USD")} / mo
        </span>
      </div>
      <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <li>{limits.creditsPerCycle.toLocaleString()} credits / month</li>
        <li>{limits.brands} brands</li>
        <li>{limits.members} team members</li>
        <li>{limits.productsPerBrand} products per brand</li>
      </ul>
      {isCurrent ? (
        <Badge variant="secondary" className="self-start">
          Current plan
        </Badge>
      ) : (
        <form action={createCheckoutSession} className="flex">
          <input type="hidden" name="plan" value={plan} />
          <Button type="submit" className="w-full">
            {plan === "PRO" ? "Upgrade to Pro" : "Upgrade to Agency"}
          </Button>
        </form>
      )}
    </div>
  );
}

function Banner({
  tone,
  icon,
  title,
  body,
}: {
  tone: "warning" | "error";
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const bg =
    tone === "warning"
      ? "border-warning/30 bg-warning/10 text-warning"
      : "border-error/30 bg-error/10 text-error";
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${bg}`}>
      <span className="mt-0.5">{icon}</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs opacity-90">{body}</span>
      </div>
    </div>
  );
}
