"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BrandProductPicker,
  type BrandOption,
  type ProductOption,
} from "@/components/generators/brand-product-picker";
import { Pills } from "@/components/generators/pills";
import { AWARENESS_LEVELS, type AwarenessLevel } from "@/lib/awareness";
import { COST_PER_UNIT } from "@/lib/generation-cost";

type Props = {
  brands: BrandOption[];
  products: ProductOption[];
  brandLanguageMap: Record<string, string[]>;
};

const COUNT_OPTIONS = [3, 5, 7, 10] as const;
const ANGLE_TYPES = [
  "Let AI Choose",
  "Pain → Solution",
  "Curiosity Hook",
  "Story-driven",
  "Authority / Expert",
  "Bold Promise",
  "Social Proof",
] as const;

export function AngleForm({ brands, products, brandLanguageMap }: Props) {
  const router = useRouter();
  const [brandId, setBrandId] = useState<string | null>(brands[0]?.id ?? null);
  const initialProduct =
    products.find((p) => p.brandId === brands[0]?.id)?.id ?? null;
  const [productId, setProductId] = useState<string | null>(initialProduct);
  const availableLangs = useMemo(
    () => (brandId ? brandLanguageMap[brandId] ?? [] : []),
    [brandId, brandLanguageMap],
  );
  const [language, setLanguage] = useState<string>(availableLangs[0] ?? "English");
  const [awareness, setAwareness] = useState<AwarenessLevel>("Problem Aware");
  const [angleType, setAngleType] = useState<string>("Let AI Choose");
  const [angleDirection, setAngleDirection] = useState("");
  const [count, setCount] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onBrandChange(id: string) {
    setBrandId(id);
    const firstProduct = products.find((p) => p.brandId === id)?.id ?? null;
    setProductId(firstProduct);
    const langs = brandLanguageMap[id] ?? [];
    if (langs.length && !langs.includes(language)) setLanguage(langs[0]);
  }

  function onSubmit() {
    setError(null);
    if (!brandId || !productId) {
      setError("Select a brand and product first.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/generate/angle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          productId,
          language,
          awareness,
          count,
          angleType,
          angleDirection: angleDirection || undefined,
        }),
      });
      if (res.ok) {
        toast.success(`Generated ${count} angle${count === 1 ? "" : "s"}`);
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        const msg =
          res.status === 402
            ? `Not enough credits (need ${body?.required ?? "?"}, have ${body?.remaining ?? 0}). Upgrade your plan.`
            : body?.error ?? "Generation failed.";
        setError(msg);
        toast.error(msg);
      }
    });
  }

  if (brands.length === 0) {
    return (
      <Empty
        title="Add a brand first"
        body="Angles are tailored to a specific brand and product."
        cta={{ href: "/brands/new", label: "Create a brand" }}
      />
    );
  }
  if (products.length === 0) {
    return (
      <Empty
        title="Add a product first"
        body="Pick the product the angles are for."
        cta={{ href: "/products/new", label: "Create a product" }}
      />
    );
  }

  const cost = COST_PER_UNIT.ANGLE * count;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
      <BrandProductPicker
        brands={brands}
        products={products}
        brandId={brandId}
        productId={productId}
        onBrandChange={onBrandChange}
        onProductChange={setProductId}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Language</label>
          <Select
            value={language}
            onValueChange={(v) => v && setLanguage(v)}
            disabled={availableLangs.length === 0}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableLangs.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Angle type</label>
          <Select value={angleType} onValueChange={(v) => v && setAngleType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANGLE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Awareness level</label>
        <Pills
          value={awareness}
          onChange={(v) => setAwareness(v)}
          options={AWARENESS_LEVELS.map((l) => ({ value: l, label: l }))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">
          Direction or inspiration{" "}
          <span className="text-muted-foreground/70">(optional)</span>
        </label>
        <Textarea
          rows={3}
          value={angleDirection}
          onChange={(e) => setAngleDirection(e.target.value)}
          placeholder="Lean into the morning routine. Avoid generic before/after framing."
          maxLength={2000}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">
          Number of angles
        </label>
        <Pills
          value={count}
          onChange={(v) => setCount(v)}
          options={COUNT_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
        />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <span className="text-xs text-muted-foreground">
          Costs {cost} credit{cost === 1 ? "" : "s"}
        </span>
        <Button onClick={onSubmit} disabled={pending} size="lg">
          <Sparkles className="size-4" />
          {pending ? "Generating…" : "Generate"}
        </Button>
      </div>
    </section>
  );
}

function Empty({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      <a
        href={cta.href}
        className="mt-1 inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-brand-hover"
      >
        {cta.label}
      </a>
    </div>
  );
}
