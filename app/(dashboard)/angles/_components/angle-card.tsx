import type { AngleOutput } from "@/lib/generation-schemas";
import { Badge } from "@/components/ui/badge";
import { LikeButtons } from "@/components/generators/like-buttons";

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

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function AngleCard({ generation }: Props) {
  const output = generation.outputContent as AngleOutput | null;
  if (!output) return null;

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">
            {generation.brand.name}
            {generation.product && ` · ${generation.product.name}`} ·{" "}
            {dateFmt.format(generation.createdAt)}
          </span>
          <span className="text-sm font-medium">
            {output.angles.length} angle{output.angles.length === 1 ? "" : "s"}
          </span>
        </div>
        <LikeButtons generationId={generation.id} initial={generation.liked} />
      </header>

      <ul className="flex flex-col gap-3">
        {output.angles.map((angle, i) => (
          <li
            key={i}
            className="flex flex-col gap-2 rounded-lg border border-white/5 bg-white/5 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{angle.headline}</span>
              <Badge variant="secondary" className="capitalize">
                {angle.awareness}
              </Badge>
            </div>
            <p className="text-sm italic text-muted-foreground">
              &ldquo;{angle.hook}&rdquo;
            </p>
            <p className="whitespace-pre-wrap text-sm">{angle.body}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Pain point:</span>{" "}
              {angle.painPoint}
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}
