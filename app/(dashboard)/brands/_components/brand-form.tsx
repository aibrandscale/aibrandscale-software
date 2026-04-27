"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Uploader } from "@/components/uploader";
import { SUPPORTED_LANGUAGES } from "@/lib/limits";
import { createBrand, updateBrand } from "@/app/actions/brands";

export type BrandFormInitial = {
  id?: string;
  name: string;
  website: string | null;
  logoUrl: string | null;
  logoKey: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  description: string;
  targetAudience: string;
  features: string[];
  languages: string[];
};

const EMPTY: BrandFormInitial = {
  name: "",
  website: "",
  logoUrl: null,
  logoKey: null,
  primaryColor: "#7c3aed",
  secondaryColor: "#0a0812",
  accentColor: "#a78bfa",
  description: "",
  targetAudience: "",
  features: [],
  languages: ["English"],
};

export function BrandForm({
  initial = EMPTY,
}: {
  initial?: BrandFormInitial;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial.id);

  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);
  const [logoKey, setLogoKey] = useState<string | null>(initial.logoKey);
  const [languages, setLanguages] = useState<string[]>(initial.languages);
  const [primary, setPrimary] = useState(initial.primaryColor);
  const [secondary, setSecondary] = useState(initial.secondaryColor);
  const [accent, setAccent] = useState(initial.accentColor);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function toggleLang(lang: string, checked: boolean) {
    setLanguages((prev) =>
      checked ? [...prev, lang] : prev.filter((l) => l !== lang),
    );
  }

  function onSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    formData.set("languages", languages.join(","));
    formData.set("primaryColor", primary);
    formData.set("secondaryColor", secondary);
    formData.set("accentColor", accent);
    if (logoKey) formData.set("logoKey", logoKey);
    else formData.delete("logoKey");

    startTransition(async () => {
      const res = isEdit && initial.id
        ? await updateBrand(initial.id, formData)
        : await createBrand(formData);
      if (res.ok) {
        router.push(`/brands/${res.brandId}`);
        router.refresh();
      } else {
        setError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      }
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-8">
      <Section title="Identity">
        <Field
          label="Logo"
          hint="Square image works best. PNG or SVG with transparent background."
        >
          <Uploader
            kind="brand-logo"
            scopeId={initial.id}
            value={logoUrl}
            onChange={(url, key) => {
              setLogoUrl(url);
              setLogoKey(key);
            }}
          />
        </Field>

        <Field label="Brand name" error={fieldErrors.name?.[0]}>
          <Input
            name="name"
            defaultValue={initial.name}
            required
            maxLength={80}
          />
        </Field>

        <Field label="Website" error={fieldErrors.website?.[0]}>
          <Input
            name="website"
            type="url"
            placeholder="https://example.com"
            defaultValue={initial.website ?? ""}
          />
        </Field>
      </Section>

      <Section title="Brand colors">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ColorField
            label="Primary"
            value={primary}
            onChange={setPrimary}
            error={fieldErrors.primaryColor?.[0]}
          />
          <ColorField
            label="Secondary"
            value={secondary}
            onChange={setSecondary}
            error={fieldErrors.secondaryColor?.[0]}
          />
          <ColorField
            label="Accent"
            value={accent}
            onChange={setAccent}
            error={fieldErrors.accentColor?.[0]}
          />
        </div>
      </Section>

      <Section title="Languages">
        <p className="text-xs text-muted-foreground">
          Generators will produce content in these languages.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const id = `lang-${lang}`;
            const checked = languages.includes(lang);
            return (
              <label
                key={lang}
                htmlFor={id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={(v) => toggleLang(lang, v === true)}
                />
                {lang}
              </label>
            );
          })}
        </div>
        {fieldErrors.languages?.[0] && (
          <p className="text-xs text-error">{fieldErrors.languages[0]}</p>
        )}
      </Section>

      <Section title="Story">
        <Field
          label="Brand description"
          hint="Voice, values, what makes you different."
          error={fieldErrors.description?.[0]}
        >
          <Textarea
            name="description"
            rows={4}
            defaultValue={initial.description}
            required
            maxLength={5000}
          />
        </Field>

        <Field
          label="Features & benefits"
          hint="One per line. These get injected into every prompt."
          error={fieldErrors.features?.[0]}
        >
          <Textarea
            name="features"
            rows={4}
            defaultValue={initial.features.join("\n")}
            placeholder={"Free shipping over $50\n30-day money-back guarantee"}
            maxLength={2000}
          />
        </Field>

        <Field
          label="Target audience"
          hint="Who you sell to."
          error={fieldErrors.targetAudience?.[0]}
        >
          <Textarea
            name="targetAudience"
            rows={3}
            defaultValue={initial.targetAudience}
            required
            maxLength={2000}
          />
        </Field>
      </Section>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create brand"}
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

function ColorField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-white/10 bg-transparent"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
        />
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
