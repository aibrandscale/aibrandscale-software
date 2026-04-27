"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-context";

export type LikeValue = "like" | "dislike" | "clear";

export async function toggleLike(
  generationId: string,
  value: LikeValue,
): Promise<{ ok: boolean }> {
  const ws = await getActiveWorkspace();

  const gen = await prisma.generation.findFirst({
    where: { id: generationId, workspaceId: ws.id },
    select: { id: true, type: true },
  });
  if (!gen) return { ok: false };

  const liked =
    value === "like" ? true : value === "dislike" ? false : null;

  await prisma.generation.update({
    where: { id: generationId },
    data: { liked },
  });

  // Revalidate the generator page (we don't know which one without the type
  // mapping, so revalidate all four).
  revalidatePath("/angles");
  revalidatePath("/advertorials");
  revalidatePath("/video-scripts");
  revalidatePath("/statics");

  return { ok: true };
}
