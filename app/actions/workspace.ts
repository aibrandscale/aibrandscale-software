"use server";

import { revalidatePath } from "next/cache";
import { unstable_update } from "@/auth";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { canManageWorkspace } from "@/lib/permissions";
import { auth } from "@/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function setActiveWorkspace(
  workspaceId: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized." };

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: session.user.id, workspaceId },
    },
    select: { id: true },
  });
  if (!membership) return { ok: false, error: "Not a member." };

  await unstable_update({ activeWorkspaceId: workspaceId });

  revalidatePath("/", "layout");
  return { ok: true };
}

const renameSchema = z.object({ name: z.string().min(1).max(60) });

export async function renameWorkspace(
  formData: FormData,
): Promise<ActionResult> {
  const ws = await getActiveWorkspace();
  if (!canManageWorkspace(ws.role)) {
    return { ok: false, error: "Forbidden." };
  }
  const parsed = renameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, error: "Invalid name." };

  await prisma.workspace.update({
    where: { id: ws.id },
    data: { name: parsed.data.name },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
