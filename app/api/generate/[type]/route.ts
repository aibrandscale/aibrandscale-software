import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { generateObject } from "ai";
import { GenerationStatus, GenerationType } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { openaiProvider, DEFAULT_MODEL } from "@/lib/openai";
import { withCredits, InsufficientCreditsError } from "@/lib/credits";
import { estimateCost } from "@/lib/generation-cost";
import { checkGenerationLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import {
  angleInputSchema,
  advertorialInputSchema,
  videoScriptInputSchema,
  staticAdInputSchema,
  angleSchema,
  advertorialSchema,
  videoScriptSchema,
  staticAdSchema,
} from "@/lib/generation-schemas";
import {
  buildAnglePrompt,
  buildAdvertorialPrompt,
  buildVideoScriptPrompt,
  buildStaticAdPrompt,
} from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TYPE_MAP: Record<string, GenerationType> = {
  angle: "ANGLE",
  advertorial: "ADVERTORIAL",
  "video-script": "VIDEO_SCRIPT",
  static: "STATIC",
};

type Ctx = { params: Promise<{ type: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { type: typeParam } = await params;
  const generationType = TYPE_MAP[typeParam];
  if (!generationType) {
    return NextResponse.json({ error: "Unknown generator" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Resolve workspace + membership
  const wantedId = session.activeWorkspaceId;
  const membership = wantedId
    ? await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: session.user.id,
            workspaceId: wantedId,
          },
        },
        select: { workspaceId: true },
      })
    : await prisma.workspaceMember.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        select: { workspaceId: true },
      });
  if (!membership) {
    return NextResponse.json({ error: "No workspace" }, { status: 403 });
  }
  const workspaceId = membership.workspaceId;

  // Rate limit per workspace
  const rl = await checkGenerationLimit(workspaceId);
  if (!rl.ok) {
    const retryAfterSec = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
    return NextResponse.json(
      {
        error: `Too many requests. Try again in ${retryAfterSec}s (${rl.window} limit).`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  // Parse + validate per type
  const parsed = parseInput(generationType, body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.errors },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Load brand + product (workspace-scoped)
  const [brand, product] = await Promise.all([
    prisma.brand.findFirst({
      where: { id: input.brandId, workspaceId },
    }),
    prisma.product.findFirst({
      where: { id: input.productId, brand: { workspaceId } },
    }),
  ]);
  if (!brand || !product || product.brandId !== brand.id) {
    return NextResponse.json(
      { error: "Brand or product not found" },
      { status: 404 },
    );
  }
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { currency: true },
  });

  const count = "count" in input ? input.count : 1;
  const cost = estimateCost(generationType, count);

  try {
    const result = await withCredits(workspaceId, cost, async () => {
      const { schema, prompt } = buildPromptFor(
        generationType,
        input,
        brand,
        product,
        ws?.currency ?? "USD",
      );

      const { object } = await generateObject({
        model: openaiProvider().chat(DEFAULT_MODEL),
        system: prompt.system,
        prompt: prompt.user,
        schema,
        temperature: 0.85,
      });

      const generation = await prisma.generation.create({
        data: {
          workspaceId,
          brandId: brand.id,
          productId: product.id,
          type: generationType,
          status: GenerationStatus.SUCCEEDED,
          inputParams: input as object,
          outputContent: object as object,
          creditsUsed: cost,
          model: DEFAULT_MODEL,
          createdById: session.user.id,
        },
        select: {
          id: true,
          createdAt: true,
          outputContent: true,
          liked: true,
        },
      });

      return generation;
    });

    revalidatePath("/angles");
    revalidatePath("/advertorials");
    revalidatePath("/video-scripts");
    revalidatePath("/statics");
    return NextResponse.json({ ok: true, generation: result });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits", remaining: err.remaining, required: err.cost },
        { status: 402 },
      );
    }
    log.error("generation.failed", { type: generationType, err });
    return NextResponse.json(
      { error: "Generation failed. Please try again." },
      { status: 500 },
    );
  }
}

function parseInput(type: GenerationType, body: unknown):
  | {
      success: true;
      data:
        | import("@/lib/generation-schemas").AngleInput
        | import("@/lib/generation-schemas").AdvertorialInput
        | import("@/lib/generation-schemas").VideoScriptInput
        | import("@/lib/generation-schemas").StaticAdInput;
    }
  | { success: false; errors: unknown } {
  switch (type) {
    case "ANGLE": {
      const r = angleInputSchema.safeParse(body);
      return r.success ? { success: true, data: r.data } : { success: false, errors: r.error.issues };
    }
    case "ADVERTORIAL": {
      const r = advertorialInputSchema.safeParse(body);
      return r.success ? { success: true, data: r.data } : { success: false, errors: r.error.issues };
    }
    case "VIDEO_SCRIPT": {
      const r = videoScriptInputSchema.safeParse(body);
      return r.success ? { success: true, data: r.data } : { success: false, errors: r.error.issues };
    }
    case "STATIC": {
      const r = staticAdInputSchema.safeParse(body);
      return r.success ? { success: true, data: r.data } : { success: false, errors: r.error.issues };
    }
  }
}

function buildPromptFor(
  type: GenerationType,
  input:
    | import("@/lib/generation-schemas").AngleInput
    | import("@/lib/generation-schemas").AdvertorialInput
    | import("@/lib/generation-schemas").VideoScriptInput
    | import("@/lib/generation-schemas").StaticAdInput,
  brand: {
    name: string;
    description: string;
    features: string[];
    targetAudience: string;
  },
  product: {
    name: string;
    description: string;
    features: string[];
    priceCents: number | null;
  },
  currency: string,
) {
  const productCtx = { ...product, currency };
  switch (type) {
    case "ANGLE": {
      const i = input as import("@/lib/generation-schemas").AngleInput;
      return {
        schema: angleSchema,
        prompt: buildAnglePrompt({
          brand,
          product: productCtx,
          awareness: i.awareness,
          count: i.count,
          language: i.language,
          angleDirection: i.angleDirection,
          angleType: i.angleType,
        }),
      };
    }
    case "ADVERTORIAL": {
      const i = input as import("@/lib/generation-schemas").AdvertorialInput;
      return {
        schema: advertorialSchema,
        prompt: buildAdvertorialPrompt({
          brand,
          product: productCtx,
          language: i.language,
          angle: i.angle,
          advertorialType: i.advertorialType,
          length: i.length,
        }),
      };
    }
    case "VIDEO_SCRIPT": {
      const i = input as import("@/lib/generation-schemas").VideoScriptInput;
      return {
        schema: videoScriptSchema,
        prompt: buildVideoScriptPrompt({
          brand,
          product: productCtx,
          awareness: i.awareness,
          language: i.language,
          angle: i.angle,
          scriptType: i.scriptType,
          length: i.length,
          count: i.count,
        }),
      };
    }
    case "STATIC": {
      const i = input as import("@/lib/generation-schemas").StaticAdInput;
      return {
        schema: staticAdSchema,
        prompt: buildStaticAdPrompt({
          brand,
          product: productCtx,
          language: i.language,
          angle: i.angle,
          staticType: i.staticType,
          count: i.count,
        }),
      };
    }
  }
}
