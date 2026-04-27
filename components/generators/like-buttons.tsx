"use client";

import { useTransition, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { toggleLike } from "@/app/actions/generations";

type Props = {
  generationId: string;
  initial: boolean | null;
};

export function LikeButtons({ generationId, initial }: Props) {
  const [liked, setLiked] = useState<boolean | null>(initial);
  const [pending, startTransition] = useTransition();

  function set(next: boolean | null) {
    const previous = liked;
    setLiked(next);
    const value = next === true ? "like" : next === false ? "dislike" : "clear";
    startTransition(async () => {
      const res = await toggleLike(generationId, value);
      if (!res.ok) setLiked(previous);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => set(liked === true ? null : true)}
        disabled={pending}
        aria-label="Like"
        aria-pressed={liked === true}
        className={cn(
          "grid size-7 place-items-center rounded-md border transition-colors",
          liked === true
            ? "border-brand bg-brand/15 text-brand-muted"
            : "border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground",
        )}
      >
        <ThumbsUp className="size-3.5" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => set(liked === false ? null : false)}
        disabled={pending}
        aria-label="Dislike"
        aria-pressed={liked === false}
        className={cn(
          "grid size-7 place-items-center rounded-md border transition-colors",
          liked === false
            ? "border-error/40 bg-error/10 text-error"
            : "border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground",
        )}
      >
        <ThumbsDown className="size-3.5" strokeWidth={1.75} />
      </button>
    </div>
  );
}
