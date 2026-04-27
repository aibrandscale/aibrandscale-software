import { z } from "zod";

import { AWARENESS_LEVELS } from "@/lib/awareness";
import { SUPPORTED_LANGUAGES } from "@/lib/limits";

// ─── Output schemas (what the model returns) ───────────────────

export const angleSchema = z.object({
  angles: z
    .array(
      z.object({
        headline: z.string().min(1),
        hook: z.string().min(1),
        body: z.string().min(1),
        awareness: z.enum(AWARENESS_LEVELS),
        painPoint: z.string().min(1),
      }),
    )
    .min(1),
});
export type AngleOutput = z.infer<typeof angleSchema>;

export const advertorialSchema = z.object({
  title: z.string().min(1),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1),
        body: z.string().min(1),
      }),
    )
    .min(1),
  cta: z.string().min(1),
});
export type AdvertorialOutput = z.infer<typeof advertorialSchema>;

export const videoScriptSchema = z.object({
  scripts: z
    .array(
      z.object({
        title: z.string().min(1),
        scenes: z
          .array(
            z.object({
              visual: z.string().min(1),
              voiceover: z.string().min(1),
              onScreenText: z.string().optional(),
              durationSec: z.number().int().positive(),
            }),
          )
          .min(1),
        totalDurationSec: z.number().int().positive(),
      }),
    )
    .min(1),
});
export type VideoScriptOutput = z.infer<typeof videoScriptSchema>;

export const staticAdSchema = z.object({
  statics: z
    .array(
      z.object({
        headline: z.string().min(1),
        subheadline: z.string().min(1),
        cta: z.string().min(1),
        imagePrompt: z.string().min(1),
      }),
    )
    .min(1),
});
export type StaticAdOutput = z.infer<typeof staticAdSchema>;

// ─── Input schemas (what the route receives from client) ───────

const langEnum = z.enum(SUPPORTED_LANGUAGES);
const awarenessEnum = z.enum(AWARENESS_LEVELS);

const baseInput = z.object({
  brandId: z.string().min(1),
  productId: z.string().min(1),
  language: langEnum,
});

export const angleInputSchema = baseInput.extend({
  awareness: awarenessEnum,
  count: z.number().int().min(1).max(10),
  angleDirection: z.string().max(2000).optional(),
  angleType: z.string().max(120).optional(),
});

export const advertorialInputSchema = baseInput.extend({
  angle: z.string().min(1).max(2000),
  advertorialType: z.string().max(120).default("Let AI Choose"),
  length: z.enum(["short", "medium", "long"]),
});

export const videoScriptInputSchema = baseInput.extend({
  awareness: awarenessEnum,
  angle: z.string().min(1).max(2000),
  scriptType: z.string().max(160).default("Let AI Choose"),
  length: z.enum(["short", "medium", "long"]),
  count: z.number().int().min(1).max(5),
});

export const staticAdInputSchema = baseInput.extend({
  angle: z.string().min(1).max(2000),
  staticType: z.string().max(120).default("Let AI Choose"),
  count: z.number().int().min(1).max(5),
});

export type AngleInput = z.infer<typeof angleInputSchema>;
export type AdvertorialInput = z.infer<typeof advertorialInputSchema>;
export type VideoScriptInput = z.infer<typeof videoScriptInputSchema>;
export type StaticAdInput = z.infer<typeof staticAdInputSchema>;
