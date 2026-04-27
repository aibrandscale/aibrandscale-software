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
import { COST_PER_UNIT } from "@/lib/generation-cost";

type Props = {
  brands: BrandOption[];
  products: ProductOption[];
  brandLanguageMap: Record<string, string[]>;
};

const LENGTH_OPTIONS = [
  { value: "short" as const, label: "Short · 300–500w" },
  { value: "medium" as const, label: "Medium · 600–900w" },
  { value: "long" as const, label: "Long · 1200–1800w" },
];

const ADVERTORIAL_TYPES = [
  "Let AI Choose",
  "Problem–Agitation–Solution (PAS) + Proof",
  "Weird Discovery / Long-burn reveal",
  "Listicle / X Reasons Why...",
  "Contrarian / Myth-busting",
  "News / Report style",
  "Testimonial & Social-Proof heavy",
  "Authority / Educational deep dive",
  "Lifestyle / Personal story",
];

export function AdvertorialForm({
  brands,
  products,
  brandLanguageMap,
}: Props) {
  const router = useRouter();
  const [brandId, setBrandId] = useState<string | null>(brands[0]?.id ?? null);
  const initialProduct =
    products.find((p) => p.brandId === brands[0]?.id)?.id ?? null;
  const [productId, setProductId] = useState<string | null>(initialProduct);
  const availableLangs = useMemo(
    () => (brandId ? brandLanguageMap[brandId] ?? [] : []),
    [brandId, brandLanguageMap],
  );
  const [language, setLanguage] = useState(availableLangs[0] ?? "English");
  const [angle, setAngle] = useState("");
  const [advertorialType, setAdvertorialType] = useState("Let AI Choose");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onBrandChange(id: string) {
    setBrandId(id);
    setProductId(products.find((p) => p.brandId === id)?.id ?? null);
    const langs = brandLanguageMap[id] ?? [];
    if (langs.length && !langs.includes(language)) setLanguage(langs[0]);
  }

  function onSubmit() {
    setError(null);
    if (!brandId || !productId) return setError("Pick a brand and product.");
    if (!angle.trim()) return setError("Add an advertorial angle.");

    startTransition(async () => {
      const res = await fetch("/api/generate/advertorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          productId,
          language,
          angle,
          advertorialType,
          length,
        }),
      });
      if (res.ok) {
        toast.success("Advertorial generated");
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        const msg =
          res.status === 402
            ? `Not enough credits (need ${body?.required}, have ${body?.remaining}).`
            : body?.error ?? "Generation failed.";
        setError(msg);
        toast.error(msg);
      }
    });
  }

  if (brands.length === 0 || products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-muted-foreground">
        Add a brand and product first to generate advertorials.
      </div>
    );
  }

  const cost = COST_PER_UNIT.ADVERTORIAL;

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
          <label className="text-xs text-muted-foreground">
            Advertorial type
          </label>
          <Select
            value={advertorialType}
            onValueChange={(v) => v && setAdvertorialType(v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADVERTORIAL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Angle</label>
        <Textarea
          rows={4}
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          placeholder="The hidden cost of overnight oats. Lead with a relatable scene from a parent's morning."
          maxLength={2000}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Length</label>
        <Pills
          value={length}
          onChange={setLength}
          options={LENGTH_OPTIONS}
        />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <span className="text-xs text-muted-foreground">Costs {cost} credits</span>
        <Button onClick={onSubmit} disabled={pending} size="lg">
          <Sparkles className="size-4" />
          {pending ? "Writing…" : "Generate advertorial"}
        </Button>
      </div>
    </section>
  );
}
