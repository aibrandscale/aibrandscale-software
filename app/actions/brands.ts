"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { getLimitsForSubscription, SUPPORTED_LANGUAGES } from "@/lib/limits";
import { deleteStorageObject } from "@/lib/storage";

const HEX = /^#[0-9a-fA-F]{6}$/;

const baseBrandSchema = z.object({
  name: z.string().min(1).max(80),
  website: z
    .union([z.string().url().max(255), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  primaryColor: z.string().regex(HEX),
  secondaryColor: z.string().regex(HEX),
  accentColor: z.string().regex(HEX),
  description: z.string().min(1).max(5000),
  targetAudience: z.string().min(1).max(2000),
  features: z
    .string()
    .max(2000)
    .transform((v) =>
      v
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  languages: z
    .string()
    .max(500)
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean))
    .pipe(
      z
        .array(z.enum(SUPPORTED_LANGUAGES))
        .min(1, "Select at least one language."),
    ),
  logoKey: z
    .union([z.string().min(1).max(500), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
});

export type BrandActionResult =
  | { ok: true; brandId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function pluck(formData: FormData) {
  return {
    name: formData.get("name"),
    website: formData.get("website") ?? "",
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    accentColor: formData.get("accentColor"),
    description: formData.get("description"),
    targetAudience: formData.get("targetAudience"),
    features: formData.get("features") ?? "",
    languages: formData.get("languages") ?? "",
    logoKey: formData.get("logoKey") ?? "",
  };
}

async function getActiveSubscription(workspaceId: string) {
  return prisma.subscription.findUnique({
    where: { workspaceId },
    select: { plan: true, status: true },
  });
}

export async function createBrand(
  formData: FormData,
): Promise<BrandActionResult> {
  const ws = await getActiveWorkspace();
  if (ws.role === "MEMBER") {
    return { ok: false, error: "Only admins can create brands." };
  }

  const sub = await getActiveSubscription(ws.id);
  const limits = sub
    ? getLimitsForSubscription(sub)
    : { brands: 1, label: "Trial" };
  const brandCount = await prisma.brand.count({ where: { workspaceId: ws.id } });
  if (brandCount >= limits.brands) {
    return {
      ok: false,
      error: `Your ${limits.label} plan allows up to ${limits.brands} brand${limits.brands === 1 ? "" : "s"}. Upgrade to add more.`,
    };
  }

  const parsed = baseBrandSchema.safeParse(pluck(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const brand = await prisma.brand.create({
    data: {
      workspaceId: ws.id,
      name: parsed.data.name,
      website: parsed.data.website,
      logoKey: parsed.data.logoKey,
      primaryColor: parsed.data.primaryColor,
      secondaryColor: parsed.data.secondaryColor,
      accentColor: parsed.data.accentColor,
      description: parsed.data.description,
      targetAudience: parsed.data.targetAudience,
      features: parsed.data.features,
      languages: parsed.data.languages,
    },
    select: { id: true },
  });

  revalidatePath("/brands");
  return { ok: true, brandId: brand.id };
}

export async function updateBrand(
  brandId: string,
  formData: FormData,
): Promise<BrandActionResult> {
  const ws = await getActiveWorkspace();
  if (ws.role === "MEMBER") {
    return { ok: false, error: "Only admins can edit brands." };
  }

  const existing = await prisma.brand.findFirst({
    where: { id: brandId, workspaceId: ws.id },
    select: { id: true, logoKey: true },
  });
  if (!existing) return { ok: false, error: "Brand not found." };

  const parsed = baseBrandSchema.safeParse(pluck(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const newLogoKey = parsed.data.logoKey;
  if (existing.logoKey && existing.logoKey !== newLogoKey) {
    void deleteStorageObject(existing.logoKey).catch(() => undefined);
  }

  await prisma.brand.update({
    where: { id: brandId },
    data: {
      name: parsed.data.name,
      website: parsed.data.website,
      logoKey: newLogoKey,
      primaryColor: parsed.data.primaryColor,
      secondaryColor: parsed.data.secondaryColor,
      accentColor: parsed.data.accentColor,
      description: parsed.data.description,
      targetAudience: parsed.data.targetAudience,
      features: parsed.data.features,
      languages: parsed.data.languages,
    },
  });

  revalidatePath("/brands");
  revalidatePath(`/brands/${brandId}`);
  return { ok: true, brandId };
}

export async function deleteBrand(formData: FormData): Promise<void> {
  const ws = await getActiveWorkspace();
  if (ws.role === "MEMBER") return;

  const brandId = String(formData.get("brandId") ?? "");
  if (!brandId) return;

  const existing = await prisma.brand.findFirst({
    where: { id: brandId, workspaceId: ws.id },
    select: { id: true, logoKey: true },
  });
  if (!existing) return;

  await prisma.brand.delete({ where: { id: brandId } });
  if (existing.logoKey) {
    void deleteStorageObject(existing.logoKey).catch(() => undefined);
  }

  revalidatePath("/brands");
  redirect("/brands");
}
