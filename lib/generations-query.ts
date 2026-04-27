import { GenerationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type GenerationsTab = "all" | "liked" | "disliked";

export async function fetchGenerations(args: {
  workspaceId: string;
  type: GenerationType;
  tab: GenerationsTab;
  take?: number;
}) {
  const where = {
    workspaceId: args.workspaceId,
    type: args.type,
    ...(args.tab === "liked" ? { liked: true } : {}),
    ...(args.tab === "disliked" ? { liked: false } : {}),
  };

  const [items, counts] = await Promise.all([
    prisma.generation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: args.take ?? 30,
      include: {
        brand: { select: { name: true } },
        product: { select: { name: true } },
      },
    }),
    prisma.generation.groupBy({
      by: ["liked"],
      where: { workspaceId: args.workspaceId, type: args.type },
      _count: { _all: true },
    }),
  ]);

  let liked = 0;
  let disliked = 0;
  let all = 0;
  for (const c of counts) {
    if (c.liked === true) liked = c._count._all;
    else if (c.liked === false) disliked = c._count._all;
    all += c._count._all;
  }

  return { items, counts: { all, liked, disliked } };
}
