import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type ActiveWorkspace = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  role: Role;
  userId: string;
  userEmail: string;
  userName: string | null;
};

/**
 * Resolves the active workspace for the current request.
 *
 * Priority: JWT `activeWorkspaceId` → first membership by `createdAt`.
 * Throws via redirect to /signin if not authenticated.
 * Redirects to /onboarding if the user has no memberships (shouldn't happen
 * for a normal signup, but covers OAuth races and manually-deleted workspaces).
 *
 * Wrapped in `cache()` so multiple calls within the same render pass hit the
 * DB once.
 */
export const getActiveWorkspace = cache(
  async (): Promise<ActiveWorkspace> => {
    const session = await auth();
    if (!session?.user?.id) redirect("/signin");

    const userId = session.user.id;
    const wantedId = session.activeWorkspaceId;

    const membership = wantedId
      ? await prisma.workspaceMember.findFirst({
          where: { userId, workspaceId: wantedId },
          include: { workspace: true },
        })
      : null;

    const fallback =
      membership ??
      (await prisma.workspaceMember.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        include: { workspace: true },
      }));

    if (!fallback) redirect("/signin");

    return {
      id: fallback.workspace.id,
      name: fallback.workspace.name,
      slug: fallback.workspace.slug,
      currency: fallback.workspace.currency,
      role: fallback.role,
      userId,
      userEmail: session.user.email ?? "",
      userName: session.user.name ?? null,
    };
  },
);

export const listUserWorkspaces = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return [];
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    role: m.role,
  }));
});

export const getWorkspaceCredits = cache(async (workspaceId: string) => {
  const sub = await prisma.subscription.findUnique({
    where: { workspaceId },
    select: {
      creditsRemaining: true,
      creditsPerCycle: true,
      status: true,
      plan: true,
    },
  });
  return sub;
});
