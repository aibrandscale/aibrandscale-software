"use client";

import { cn } from "@/lib/utils";

type PillsProps<T extends string | number> = {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
  size?: "sm" | "md";
};

export function Pills<T extends string | number>({
  value,
  onChange,
  options,
  size = "md",
}: PillsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center justify-center rounded-full border text-xs font-medium transition-colors",
              size === "sm" ? "h-7 px-3" : "h-8 px-3.5",
              active
                ? "border-brand bg-brand/15 text-brand-muted"
                : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
