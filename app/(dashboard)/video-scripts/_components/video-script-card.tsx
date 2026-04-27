import type { VideoScriptOutput } from "@/lib/generation-schemas";
import { Badge } from "@/components/ui/badge";
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

export function VideoScriptCard({ generation }: Props) {
  const output = generation.outputContent as VideoScriptOutput | null;
  if (!output) return null;

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
      <header className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {generation.brand.name}
          {generation.product && ` · ${generation.product.name}`} ·{" "}
          {dateFmt.format(generation.createdAt)} · {output.scripts.length} script
          {output.scripts.length === 1 ? "" : "s"}
        </span>
        <LikeButtons generationId={generation.id} initial={generation.liked} />
      </header>

      <div className="flex flex-col gap-4">
        {output.scripts.map((script, i) => (
          <section
            key={i}
            className="flex flex-col gap-3 rounded-lg border border-white/5 bg-white/5 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">{script.title}</h4>
              <Badge variant="secondary">~{script.totalDurationSec}s</Badge>
            </div>

            <ol className="flex flex-col gap-3">
              {script.scenes.map((scene, j) => (
                <li
                  key={j}
                  className="grid grid-cols-[auto_1fr] gap-3 text-sm"
                >
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <span className="grid size-6 place-items-center rounded-full bg-brand/15 text-xs font-semibold text-brand-muted">
                      {j + 1}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {scene.durationSec}s
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p>
                      <span className="text-xs font-medium text-muted-foreground">
                        Visual:
                      </span>{" "}
                      {scene.visual}
                    </p>
                    <p>
                      <span className="text-xs font-medium text-muted-foreground">
                        Voiceover:
                      </span>{" "}
                      <span className="italic">{scene.voiceover}</span>
                    </p>
                    {scene.onScreenText && (
                      <p className="text-xs">
                        <span className="font-medium text-muted-foreground">
                          On-screen:
                        </span>{" "}
                        <span className="rounded bg-white/10 px-1.5 py-0.5">
                          {scene.onScreenText}
                        </span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </article>
  );
}
