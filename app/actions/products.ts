"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { getLimitsForSubscription } from "@/lib/limits";
import { deleteStorageObject } from "@/lib/storage";

const productSchema = z.object({
  brandId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(5000),
  features: z
    .string()
    .max(2000)
    .transform((v) =>
      v
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  priceCents: z
    .union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.literal("")])
    .optional()
    .transform((v) => {
      if (!v) return null;
      return Math.round(Number(v) * 100);
    }),
  imageKeys: z
    .string()
    .max(10_000)
    .optional()
    .transform((v) => {
      if (!v) return [] as string[];
      try {
        const parsed = JSON.parse(v);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
          (k): k is string => typeof k === "string" && k.length > 0,
        );
      } catch {
        return [];
      }
    }),
});

export type ProductActionResult =
  | { ok: true; productId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function pluck(formData: FormData) {
  return {
    brandId: formData.get("brandId"),
    name: formData.get("name"),
    description: formData.get("description"),
    features: formData.get("features") ?? "",
    priceCents: formData.get("priceCents") ?? "",
    imageKeys: formData.get("imageKeys") ?? "",
  };
}

async function assertBrandInWorkspace(brandId: string, workspaceId: string) {
  return prisma.brand.findFirst({
    where: { id: brandId, workspaceId },
    select: { id: true },
  });
}

export async function createProduct(
  formData: FormData,
): Promise<ProductActionResult> {
  const ws = await getActiveWorkspace();
  if (ws.role === "MEMBER") {
    return { ok: false, error: "Only admins can create products." };
  }

  const parsed = productSchema.safeParse(pluck(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const brand = await assertBrandInWorkspace(parsed.data.brandId, ws.id);
  if (!brand) return { ok: false, error: "Brand not found." };

  const sub = await prisma.subscription.findUnique({
    where: { workspaceId: ws.id },
    select: { plan: true, status: true },
  });
  const limits = sub
    ? getLimitsForSubscription(sub)
    : { productsPerBrand: 5, label: "Trial" };
  const productCount = await prisma.product.count({
    where: { brandId: brand.id },
  });
  if (productCount >= limits.productsPerBrand) {
    return {
      ok: false,
      error: `Your ${limits.label} plan allows up to ${limits.productsPerBrand} products per brand.`,
    };
  }

  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: parsed.data.name,
      description: parsed.data.description,
      features: parsed.data.features,
      priceCents: parsed.data.priceCents,
      imageKeys: parsed.data.imageKeys,
    },
    select: { id: true },
  });

  revalidatePath("/products");
  revalidatePath(`/brands/${brand.id}`);
  return { ok: true, productId: product.id };
}

export async function updateProduct(
  productId: string,
  formData: FormData,
): Promise<ProductActionResult> {
  const ws = await getActiveWorkspace();
  if (ws.role === "MEMBER") {
    return { ok: false, error: "Only admins can edit products." };
  }

  const existing = await prisma.product.findFirst({
    where: { id: productId, brand: { workspaceId: ws.id } },
    select: { id: true, brandId: true, imageKeys: true },
  });
  if (!existing) return { ok: false, error: "Product not found." };

  const parsed = productSchema.safeParse(pluck(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  // If brand changed, re-check ownership + per-brand cap.
  if (parsed.data.brandId !== existing.brandId) {
    const newBrand = await assertBrandInWorkspace(parsed.data.brandId, ws.id);
    if (!newBrand) return { ok: false, error: "Brand not found." };
  }

  const removedKeys = existing.imageKeys.filter(
    (k) => !parsed.data.imageKeys.includes(k),
  );
  for (const key of removedKeys) {
    void deleteStorageObject(key).catch(() => undefined);
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      brandId: parsed.data.brandId,
      name: parsed.data.name,
      description: parsed.data.description,
      features: parsed.data.features,
      priceCents: parsed.data.priceCents,
      imageKeys: parsed.data.imageKeys,
    },
  });

  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath(`/brands/${parsed.data.brandId}`);
  return { ok: true, productId };
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const ws = await getActiveWorkspace();
  if (ws.role === "MEMBER") return;

  const productId = String(formData.get("productId") ?? "");
  if (!productId) return;

  const existing = await prisma.product.findFirst({
    where: { id: productId, brand: { workspaceId: ws.id } },
    select: { id: true, brandId: true, imageKeys: true },
  });
  if (!existing) return;

  await prisma.product.delete({ where: { id: productId } });
  for (const key of existing.imageKeys) {
    void deleteStorageObject(key).catch(() => undefined);
  }

  revalidatePath("/products");
  revalidatePath(`/brands/${existing.brandId}`);
  redirect("/products");
}
