import { Prisma, UsageEventKind } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class InsufficientCreditsError extends Error {
  readonly code = "INSUFFICIENT_CREDITS";
  constructor(public readonly remaining: number, public readonly cost: number) {
    super(
      `Insufficient credits: ${remaining} remaining, ${cost} required.`,
    );
  }
}

export type WithCreditsContext = {
  workspaceId: string;
  estimatedCost: number;
  /** Records the actual cost. Defaults to estimatedCost on `commit`. */
  setActualCost: (n: number) => void;
};

/**
 * Pessimistic credit deduction wrapper.
 *
 * 1. Atomically decrement `creditsRemaining` by `estimatedCost` only if there
 *    is enough balance. (Single SQL statement, race-safe.)
 * 2. Run the body. The body may call `setActualCost(n)` to reconcile. If the
 *    body throws, the pre-decrement is fully refunded and the inner error is
 *    rethrown unchanged.
 * 3. On success, if `actualCost < estimatedCost` the difference is refunded
 *    and a `GENERATION_REFUND` UsageEvent is recorded. The original charge
 *    is recorded as `GENERATION_CHARGE`.
 */
export async function withCredits<T>(
  workspaceId: string,
  estimatedCost: number,
  body: (ctx: WithCreditsContext) => Promise<T>,
): Promise<T> {
  if (estimatedCost <= 0) throw new Error("estimatedCost must be > 0");

  // 1. Reserve credits atomically.
  const reserved = await prisma.subscription.updateMany({
    where: { workspaceId, creditsRemaining: { gte: estimatedCost } },
    data: { creditsRemaining: { decrement: estimatedCost } },
  });
  if (reserved.count === 0) {
    const sub = await prisma.subscription.findUnique({
      where: { workspaceId },
      select: { creditsRemaining: true },
    });
    throw new InsufficientCreditsError(sub?.creditsRemaining ?? 0, estimatedCost);
  }

  let actualCost = estimatedCost;
  const ctx: WithCreditsContext = {
    workspaceId,
    estimatedCost,
    setActualCost: (n) => {
      if (n < 0) throw new Error("actualCost cannot be negative");
      if (n > estimatedCost) {
        // We never let actual exceed the reserved ceiling.
        actualCost = estimatedCost;
      } else {
        actualCost = n;
      }
    },
  };

  try {
    const result = await body(ctx);
    const refundAmount = estimatedCost - actualCost;

    await prisma.$transaction(async (tx) => {
      await tx.usageEvent.create({
        data: {
          workspaceId,
          kind: UsageEventKind.GENERATION_CHARGE,
          creditsDelta: -actualCost,
        },
      });
      if (refundAmount > 0) {
        await tx.subscription.update({
          where: { workspaceId },
          data: { creditsRemaining: { increment: refundAmount } },
        });
        await tx.usageEvent.create({
          data: {
            workspaceId,
            kind: UsageEventKind.GENERATION_REFUND,
            creditsDelta: refundAmount,
            note: "Reconciliation: actual cost below estimate",
          },
        });
      }
    });

    return result;
  } catch (err) {
    // Full refund. Best-effort — log but don't mask the original error.
    try {
      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { workspaceId },
          data: { creditsRemaining: { increment: estimatedCost } },
        });
        await tx.usageEvent.create({
          data: {
            workspaceId,
            kind: UsageEventKind.GENERATION_REFUND,
            creditsDelta: estimatedCost,
            note: "Refund: generation failed",
          },
        });
      });
    } catch (refundErr) {
      console.error("credit refund failed", refundErr);
    }
    throw err;
  }
}

export async function creditsRemaining(workspaceId: string): Promise<number> {
  const sub = await prisma.subscription.findUnique({
    where: { workspaceId },
    select: { creditsRemaining: true },
  });
  return sub?.creditsRemaining ?? 0;
}

export async function refillCredits(
  workspaceId: string,
  amount: number,
  kind: UsageEventKind = UsageEventKind.CYCLE_REFILL,
  note?: string,
): Promise<void> {
  if (amount <= 0) return;
  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { workspaceId },
      data: { creditsRemaining: { increment: amount } },
    });
    await tx.usageEvent.create({
      data: {
        workspaceId,
        kind,
        creditsDelta: amount,
        note,
      },
    });
  });
}

/**
 * Sets `creditsRemaining` to an absolute value (used at cycle reset where
 * credits do NOT roll over per spec).
 */
export async function resetCreditsTo(
  workspaceId: string,
  amount: number,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.findUnique({
      where: { workspaceId },
      select: { creditsRemaining: true },
    });
    const current = sub?.creditsRemaining ?? 0;
    const delta = amount - current;
    await tx.subscription.update({
      where: { workspaceId },
      data: { creditsRemaining: amount },
    });
    await tx.usageEvent.create({
      data: {
        workspaceId,
        kind: UsageEventKind.CYCLE_REFILL,
        creditsDelta: delta,
        note: `Cycle reset to ${amount}`,
      },
    });
  });
}

// Re-export Prisma error helper for callers that want to discriminate.
export { Prisma as PrismaErrors };
