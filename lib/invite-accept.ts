import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Consume any unaccepted, unexpired invites that match the given email and
 * promote the user to the listed workspaces. Idempotent. Safe to call from
 * both OAuth signup (via `events.createUser`) and Credentials signup.
 *
 * If the user is already a member of a workspace they were invited to, the
 * invite is still marked accepted but the existing membership/role is left
 * intact (don't downgrade an OWNER to MEMBER on accident).
 */
export async function acceptPendingInvitesForEmail(
  userId: string,
  email: string,
): Promise<number> {
  const normalized = email.toLowerCase();
  const now = new Date();

  const invites = await prisma.invite.findMany({
    where: {
      email: normalized,
      acceptedAt: null,
      expiresAt: { gt: now },
    },
    select: { id: true, workspaceId: true, role: true },
  });

  if (invites.length === 0) return 0;

  await prisma.$transaction(async (tx) => {
    for (const invite of invites) {
      const existing = await tx.workspaceMember.findUnique({
        where: {
          userId_workspaceId: { userId, workspaceId: invite.workspaceId },
        },
      });
      if (!existing) {
        await tx.workspaceMember.create({
          data: {
            userId,
            workspaceId: invite.workspaceId,
            role: invite.role as Role,
          },
        });
      }
      await tx.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: now },
      });
    }
  });

  return invites.length;
}
