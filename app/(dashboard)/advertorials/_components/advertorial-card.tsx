import type { AdvertorialOutput } from "@/lib/generation-schemas";
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

export function AdvertorialCard({ generation }: Props) {
  const output = generation.outputContent as AdvertorialOutput | null;
  if (!output) return null;

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">
            {generation.brand.name}
            {generation.product && ` · ${generation.product.name}`} ·{" "}
            {dateFmt.format(generation.createdAt)}
          </span>
          <h3 className="text-lg font-semibold tracking-tight">
            {output.title}
          </h3>
        </div>
        <LikeButtons generationId={generation.id} initial={generation.liked} />
      </header>

      <div className="flex flex-col gap-4">
        {output.sections.map((s, i) => (
          <section key={i} className="flex flex-col gap-1.5">
            <h4 className="text-sm font-semibold">{s.heading}</h4>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {s.body}
            </p>
          </section>
        ))}
      </div>

      <div className="rounded-lg border border-brand/30 bg-brand/10 p-4 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-brand-muted">
          Call to action
        </span>
        <p className="mt-1 text-sm">{output.cta}</p>
      </div>
    </article>
  );
}
