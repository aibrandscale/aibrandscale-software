import { Role, SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const TRIAL_CREDITS = 50;

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace"
  );
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let suffix = 1;
  while (await prisma.workspace.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
  return candidate;
}

/**
 * Idempotently ensures the user has at least one workspace + OWNER membership
 * + trial subscription. Safe to call from `events.createUser` (OAuth signup) or
 * the credentials signup Server Action.
 */
export async function ensureWorkspaceForUser(userId: string): Promise<string> {
  const existing = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  });
  if (existing) return existing.workspaceId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) throw new Error(`User ${userId} not found`);

  const baseName = user.name?.split(/\s+/)[0] ?? user.email.split("@")[0];
  const slug = await uniqueSlug(`${baseName}s-workspace`);

  const workspace = await prisma.workspace.create({
    data: {
      name: `${baseName}'s Workspace`,
      slug,
      members: {
        create: { userId, role: Role.OWNER },
      },
      subscription: {
        create: {
          status: SubscriptionStatus.TRIALING,
          creditsPerCycle: TRIAL_CREDITS,
          creditsRemaining: TRIAL_CREDITS,
        },
      },
      usageEvents: {
        create: {
          kind: "TRIAL_GRANT",
          creditsDelta: TRIAL_CREDITS,
          note: "Welcome — 50 trial credits",
        },
      },
    },
    select: { id: true },
  });

  return workspace.id;
}
