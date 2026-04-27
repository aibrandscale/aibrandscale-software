"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MultiImageUploader,
  type ImageEntry,
} from "@/components/multi-image-uploader";
import { createProduct, updateProduct } from "@/app/actions/products";

export type ProductFormBrand = { id: string; name: string };

export type ProductFormInitial = {
  id?: string;
  brandId: string;
  name: string;
  description: string;
  features: string[];
  priceCents: number | null;
  images: ImageEntry[];
};

export function ProductForm({
  brands,
  initial,
  defaultBrandId,
  currency,
}: {
  brands: ProductFormBrand[];
  initial?: ProductFormInitial;
  defaultBrandId?: string;
  currency: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const [brandId, setBrandId] = useState(
    initial?.brandId ?? defaultBrandId ?? brands[0]?.id ?? "",
  );
  const [images, setImages] = useState<ImageEntry[]>(initial?.images ?? []);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    formData.set("brandId", brandId);
    formData.set("imageKeys", JSON.stringify(images.map((i) => i.key)));

    startTransition(async () => {
      const res =
        isEdit && initial?.id
          ? await updateProduct(initial.id, formData)
          : await createProduct(formData);
      if (res.ok) {
        router.push(`/products/${res.productId}`);
        router.refresh();
      } else {
        setError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      }
    });
  }

  if (brands.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Create a brand first — products belong to a brand.
        </p>
      </div>
    );
  }

  const initialPrice =
    initial?.priceCents != null
      ? (initial.priceCents / 100).toFixed(2)
      : "";

  return (
    <form action={onSubmit} className="flex flex-col gap-8">
      <Section title="Brand">
        <Field label="Brand" error={fieldErrors.brandId?.[0]}>
          <Select value={brandId} onValueChange={(v) => v && setBrandId(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Section title="Images">
        <MultiImageUploader
          scopeId={initial?.id}
          value={images}
          onChange={setImages}
        />
      </Section>

      <Section title="Details">
        <Field label="Product name" error={fieldErrors.name?.[0]}>
          <Input
            name="name"
            defaultValue={initial?.name}
            required
            maxLength={120}
          />
        </Field>

        <Field
          label="Description"
          hint="What it is, what it does, why it matters."
          error={fieldErrors.description?.[0]}
        >
          <Textarea
            name="description"
            rows={4}
            defaultValue={initial?.description}
            required
            maxLength={5000}
          />
        </Field>

        <Field
          label="Features"
          hint="One per line."
          error={fieldErrors.features?.[0]}
        >
          <Textarea
            name="features"
            rows={4}
            defaultValue={initial?.features.join("\n")}
            maxLength={2000}
          />
        </Field>

        <Field
          label={`Price (${currency})`}
          hint="Optional. Used for context in generators."
          error={fieldErrors.priceCents?.[0]}
        >
          <Input
            name="priceCents"
            type="text"
            inputMode="decimal"
            defaultValue={initialPrice}
            placeholder="49.99"
            maxLength={12}
          />
        </Field>
      </Section>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={pending}
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
