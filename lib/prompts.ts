import { AWARENESS_GUIDE, type AwarenessLevel } from "@/lib/awareness";

export type BrandContext = {
  name: string;
  description: string;
  features: string[];
  targetAudience: string;
};

export type ProductContext = {
  name: string;
  description: string;
  features: string[];
  priceCents: number | null;
  currency: string;
};

export const LENGTH_WORDS = {
  short: { advertorial: "300–500 words" },
  medium: { advertorial: "600–900 words" },
  long: { advertorial: "1200–1800 words" },
};

export const VIDEO_LENGTH_SECONDS = {
  short: 30,
  medium: 60,
  long: 90,
};

function brandBlock(brand: BrandContext): string {
  return [
    `# Brand`,
    `Name: ${brand.name}`,
    `Description: ${brand.description}`,
    `Target audience: ${brand.targetAudience}`,
    brand.features.length > 0
      ? `Key features:\n- ${brand.features.join("\n- ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function productBlock(product: ProductContext): string {
  const price =
    product.priceCents != null
      ? `${(product.priceCents / 100).toFixed(2)} ${product.currency}`
      : "(not specified)";
  return [
    `# Product`,
    `Name: ${product.name}`,
    `Description: ${product.description}`,
    `Price: ${price}`,
    product.features.length > 0
      ? `Features:\n- ${product.features.join("\n- ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function awarenessBlock(level: AwarenessLevel): string {
  return `# Reader awareness: ${level}\n${AWARENESS_GUIDE[level]}`;
}

function languageInstruction(lang: string): string {
  return `# Language\nWrite ALL output in ${lang}. Do not switch languages mid-output.`;
}

export function buildAnglePrompt(args: {
  brand: BrandContext;
  product: ProductContext;
  awareness: AwarenessLevel;
  count: number;
  language: string;
  angleDirection?: string;
  angleType?: string;
}): { system: string; user: string } {
  const system = [
    `You are a senior direct-response copywriter for e-commerce brands.`,
    `Generate ${args.count} distinct marketing angles for the product below.`,
    `Each angle must have a fresh hook, a different emotional driver, and a clear pain point it addresses.`,
    `Match the requested awareness level. Vary the angles widely — do not paraphrase one idea ${args.count} times.`,
  ].join(" ");

  const user = [
    brandBlock(args.brand),
    productBlock(args.product),
    awarenessBlock(args.awareness),
    languageInstruction(args.language),
    args.angleType && args.angleType !== "Let AI Choose"
      ? `# Angle type\n${args.angleType}`
      : null,
    args.angleDirection ? `# Direction / inspiration\n${args.angleDirection}` : null,
    `# Output\nReturn ${args.count} angles. For each: headline (under 12 words), hook (1 sentence opener), body (3–5 sentences), the awareness level, and the pain point it addresses.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { system, user };
}

export function buildAdvertorialPrompt(args: {
  brand: BrandContext;
  product: ProductContext;
  language: string;
  angle: string;
  advertorialType: string;
  length: "short" | "medium" | "long";
}): { system: string; user: string } {
  const system = [
    `You are a long-form direct-response writer producing native-style advertorials that read like editorial content.`,
    `Hook the reader in the first paragraph. Make the body feel earned. Drive to a clear CTA at the end.`,
  ].join(" ");

  const user = [
    brandBlock(args.brand),
    productBlock(args.product),
    languageInstruction(args.language),
    `# Angle\n${args.angle}`,
    args.advertorialType !== "Let AI Choose"
      ? `# Format\n${args.advertorialType}`
      : null,
    `# Length\n${LENGTH_WORDS[args.length].advertorial}`,
    `# Output\nProduce one advertorial: a strong title, 4–8 sections each with a heading and body, and a final CTA paragraph.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { system, user };
}

export function buildVideoScriptPrompt(args: {
  brand: BrandContext;
  product: ProductContext;
  awareness: AwarenessLevel;
  language: string;
  angle: string;
  scriptType: string;
  length: "short" | "medium" | "long";
  count: number;
}): { system: string; user: string } {
  const seconds = VIDEO_LENGTH_SECONDS[args.length];
  const system = [
    `You are a short-form video scriptwriter for paid social ads (TikTok, Reels, Shorts).`,
    `Write scripts as scene-by-scene shooting plans: visual, voiceover, on-screen text, scene duration.`,
    `Hook in the first 2 seconds. Match the requested awareness and angle.`,
  ].join(" ");

  const user = [
    brandBlock(args.brand),
    productBlock(args.product),
    awarenessBlock(args.awareness),
    languageInstruction(args.language),
    `# Angle\n${args.angle}`,
    args.scriptType !== "Let AI Choose"
      ? `# Script style\n${args.scriptType}`
      : null,
    `# Length\nApproximately ${seconds} seconds total per script.`,
    `# Output\nReturn ${args.count} distinct scripts. Each script: a title, 4–8 scenes with visual / voiceover / optional on-screen text / duration in seconds, and a totalDurationSec.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { system, user };
}

export function buildStaticAdPrompt(args: {
  brand: BrandContext;
  product: ProductContext;
  language: string;
  angle: string;
  staticType: string;
  count: number;
}): { system: string; user: string } {
  const system = [
    `You are a static-ad creative director.`,
    `For each static, produce DALL-E-ready image prompt + ad copy (headline, subheadline, CTA).`,
    `Image prompts should describe composition, lighting, subject, mood, and style — but NOT include any text overlay description (text is added in design).`,
  ].join(" ");

  const user = [
    brandBlock(args.brand),
    productBlock(args.product),
    languageInstruction(args.language),
    `# Angle\n${args.angle}`,
    args.staticType !== "Let AI Choose"
      ? `# Static style\n${args.staticType}`
      : null,
    `# Output\nReturn ${args.count} statics. Each: headline (5–10 words), subheadline (under 20 words), CTA (2–4 words), and an imagePrompt suitable for DALL-E 3.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { system, user };
}
