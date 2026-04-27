"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getActiveWorkspace } from "@/lib/workspace-context";
import {
  canInvite,
  canRemoveMember,
  canChangeRole,
} from "@/lib/permissions";
import {
  generateInviteToken,
  hashInviteToken,
  inviteExpiresAt,
} from "@/lib/invite-token";
import { sendEmail, inviteEmailHtml } from "@/lib/email";
import { env } from "@/lib/env";
import { acceptPendingInvitesForEmail } from "@/lib/invite-accept";

const ROLE = z.enum(["OWNER", "ADMIN", "MEMBER"]);
const inviteSchema = z.object({
  email: z.string().email().max(254),
  role: ROLE,
});

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function inviteMember(formData: FormData): Promise<ActionResult> {
  const ws = await getActiveWorkspace();
  if (!canInvite(ws.role)) {
    return { ok: false, error: "You don't have permission to invite members." };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid email or role." };
  }
  if (parsed.data.role === "OWNER") {
    return { ok: false, error: "Cannot invite as OWNER." };
  }

  const email = parsed.data.email.toLowerCase();

  // Already a member?
  const existingMember = await prisma.user.findUnique({
    where: { email },
    select: {
      memberships: {
        where: { workspaceId: ws.id },
        select: { id: true },
      },
    },
  });
  if (existingMember?.memberships.length) {
    return { ok: false, error: "That user is already a member." };
  }

  // Existing pending invite? Replace it.
  const existingInvite = await prisma.invite.findFirst({
    where: { workspaceId: ws.id, email, acceptedAt: null },
    select: { id: true },
  });
  if (existingInvite) {
    await prisma.invite.delete({ where: { id: existingInvite.id } });
  }

  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);
  const expiresAt = inviteExpiresAt();

  await prisma.invite.create({
    data: {
      workspaceId: ws.id,
      email,
      role: parsed.data.role,
      tokenHash,
      expiresAt,
      createdById: ws.userId,
    },
  });

  const acceptUrl = `${env.NEXTAUTH_URL.replace(/\/$/, "")}/invite/${rawToken}`;

  try {
    await sendEmail({
      to: email,
      subject: `Join ${ws.name} on AI BrandScale`,
      html: inviteEmailHtml({
        workspaceName: ws.name,
        inviterName: ws.userName ?? ws.userEmail,
        acceptUrl,
        expiresInDays: 7,
      }),
      text: `${ws.userName ?? ws.userEmail} invited you to ${ws.name}: ${acceptUrl}`,
    });
  } catch (err) {
    console.error("invite email failed", err);
    // Don't roll back — the invite is in the DB, admin can resend.
  }

  revalidatePath("/team");
  return { ok: true };
}

export async function revokeInvite(formData: FormData): Promise<ActionResult> {
  const ws = await getActiveWorkspace();
  if (!canInvite(ws.role)) {
    return { ok: false, error: "Forbidden." };
  }

  const inviteId = String(formData.get("inviteId") ?? "");
  if (!inviteId) return { ok: false, error: "Missing invite id." };

  const result = await prisma.invite.deleteMany({
    where: { id: inviteId, workspaceId: ws.id, acceptedAt: null },
  });
  if (result.count === 0) {
    return { ok: false, error: "Invite not found." };
  }

  revalidatePath("/team");
  return { ok: true };
}

export async function removeMember(formData: FormData): Promise<ActionResult> {
  const ws = await getActiveWorkspace();
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) return { ok: false, error: "Missing member id." };

  const target = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId: ws.id },
    select: { userId: true, role: true },
  });
  if (!target) return { ok: false, error: "Member not found." };

  // Self-leave allowed for non-owners
  const isSelf = target.userId === ws.userId;
  if (isSelf && ws.role === "OWNER") {
    return {
      ok: false,
      error: "Owners cannot leave. Transfer ownership first.",
    };
  }
  if (!isSelf && !canRemoveMember(ws.role, target.role)) {
    return { ok: false, error: "Forbidden." };
  }

  await prisma.workspaceMember.delete({ where: { id: memberId } });

  revalidatePath("/team");
  return { ok: true };
}

export async function changeRole(formData: FormData): Promise<ActionResult> {
  const ws = await getActiveWorkspace();
  const memberId = String(formData.get("memberId") ?? "");
  const nextRoleParsed = ROLE.safeParse(formData.get("role"));
  if (!memberId || !nextRoleParsed.success) {
    return { ok: false, error: "Invalid input." };
  }

  const target = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId: ws.id },
    select: { id: true, userId: true, role: true },
  });
  if (!target) return { ok: false, error: "Member not found." };
  if (target.userId === ws.userId) {
    return { ok: false, error: "Cannot change your own role." };
  }
  if (!canChangeRole(ws.role, target.role, nextRoleParsed.data)) {
    return { ok: false, error: "Forbidden." };
  }

  await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role: nextRoleParsed.data },
  });

  revalidatePath("/team");
  return { ok: true };
}

export async function acceptInvite(rawToken: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect(`/signup?invite=${encodeURIComponent(rawToken)}`);
  }

  const tokenHash = hashInviteToken(rawToken);
  const invite = await prisma.invite.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      workspaceId: true,
      email: true,
      role: true,
      acceptedAt: true,
      expiresAt: true,
    },
  });

  if (!invite) {
    return { ok: false, error: "Invitation not found." };
  }
  if (invite.acceptedAt) {
    return { ok: false, error: "Invitation already accepted." };
  }
  if (invite.expiresAt < new Date()) {
    return { ok: false, error: "Invitation has expired." };
  }
  if (invite.email !== session.user.email.toLowerCase()) {
    return {
      ok: false,
      error: `This invitation is for ${invite.email}. Sign in with that account to accept.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.user.id,
          workspaceId: invite.workspaceId,
        },
      },
    });
    if (!existing) {
      await tx.workspaceMember.create({
        data: {
          userId: session.user.id,
          workspaceId: invite.workspaceId,
          role: invite.role,
        },
      });
    }
    await tx.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });

  revalidatePath("/team");
  return { ok: true };
}

// Re-export so callers can grab it from one place
export { acceptPendingInvitesForEmail };
