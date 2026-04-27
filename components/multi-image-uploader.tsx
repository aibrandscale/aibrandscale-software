"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";

export type ImageEntry = { key: string; url: string };

type Props = {
  scopeId?: string;
  value: ImageEntry[];
  onChange: (next: ImageEntry[]) => void;
  max?: number;
};

export function MultiImageUploader({
  scopeId,
  value,
  onChange,
  max = 6,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const slotsLeft = Math.max(0, max - value.length);

  async function handleFiles(files: FileList) {
    setError(null);
    const arr = Array.from(files).slice(0, slotsLeft);
    if (arr.length === 0) return;

    setUploading(true);
    try {
      const next: ImageEntry[] = [...value];
      for (const file of arr) {
        if (file.size > MAX_BYTES) {
          throw new Error(`"${file.name}" is larger than 5MB.`);
        }
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "product-image",
            contentType: file.type,
            size: file.size,
            scopeId,
          }),
        });
        if (!presignRes.ok) {
          const body = await presignRes.json().catch(() => ({}));
          throw new Error(body?.error ?? "Presign failed");
        }
        const { key, token, publicUrl } = (await presignRes.json()) as {
          key: string;
          uploadUrl: string;
          token: string;
          publicUrl: string;
        };

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !anonKey) {
          throw new Error("Supabase storage is not configured.");
        }
        const bucket =
          process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "uploads";
        const supabase = createClient(supabaseUrl, anonKey);
        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .uploadToSignedUrl(key, token, file, {
            contentType: file.type,
            upsert: false,
          });
        if (uploadErr) throw new Error(uploadErr.message);

        next.push({ key, url: publicUrl });
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function moveBy(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {value.map((img, i) => (
          <figure
            key={img.key}
            className="group relative overflow-hidden rounded-lg border border-white/10 bg-white/5 aspect-square"
          >
            <Image
              src={img.url}
              alt={`Product image ${i + 1}`}
              fill
              sizes="200px"
              className="object-cover"
            />
            <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="secondary"
                  onClick={() => moveBy(i, -1)}
                  disabled={i === 0}
                  aria-label="Move left"
                >
                  <ArrowLeft className="size-3" />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="secondary"
                  onClick={() => moveBy(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label="Move right"
                >
                  <ArrowRight className="size-3" />
                </Button>
              </div>
              <Button
                type="button"
                size="icon-xs"
                variant="destructive"
                onClick={() => removeAt(i)}
                aria-label="Remove"
              >
                <X className="size-3" />
              </Button>
            </div>
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                Primary
              </span>
            )}
          </figure>
        ))}

        {slotsLeft > 0 && (
          <label
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 bg-white/5 text-xs text-muted-foreground transition-colors hover:bg-white/10"
            aria-label="Add image"
          >
            {uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Plus className="size-5" />
            )}
            <span>{uploading ? "Uploading…" : "Add image"}</span>
            <input
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Up to {max} images. First image is the primary thumbnail.
      </p>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
