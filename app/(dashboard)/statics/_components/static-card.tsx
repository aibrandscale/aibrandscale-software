"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

import type { StaticAdOutput } from "@/lib/generation-schemas";
import { Button } from "@/components/ui/button";
import { LikeButtons } from "@/components/generators/like-buttons";

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type Props = {
  generation: {
    id: string;
    createdAt: Date;
    liked: boolean | null;
    outputContent: unknown;
    brand: { name: string };
    product: { name: string } | null;
  };
};

export function StaticCard({ generation }: Props) {
  const output = generation.outputContent as StaticAdOutput | null;
  if (!output) return null;

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
      <header className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {generation.brand.name}
          {generation.product && ` · ${generation.product.name}`} ·{" "}
          {dateFmt.format(generation.createdAt)} · {output.statics.length} static
          {output.statics.length === 1 ? "" : "s"}
        </span>
        <LikeButtons generationId={generation.id} initial={generation.liked} />
      </header>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {output.statics.map((s, i) => (
          <li
            key={i}
            className="flex flex-col gap-3 rounded-lg border border-white/5 bg-white/5 p-4"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Headline
              </span>
              <span className="text-sm font-semibold leading-tight">
                {s.headline}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Subheadline
              </span>
              <span className="text-sm">{s.subheadline}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                CTA
              </span>
              <span className="self-start rounded-md bg-brand/15 px-2 py-1 text-xs font-medium text-brand-muted">
                {s.cta}
              </span>
            </div>
            <ImagePromptBlock prompt={s.imagePrompt} />
          </li>
        ))}
      </ul>
    </article>
  );
}

function ImagePromptBlock({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          DALL-E prompt
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={copy}
          className="text-xs"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="rounded-md border border-white/5 bg-black/20 p-2.5 text-xs leading-relaxed text-muted-foreground">
        {prompt}
      </p>
    </div>
  );
}
