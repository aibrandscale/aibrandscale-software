"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type UploaderProps = {
  kind: "brand-logo" | "product-image";
  scopeId?: string;
  value: string | null; // public URL
  onChange: (publicUrl: string | null, key: string | null) => void;
  className?: string;
  shape?: "square" | "circle";
  /** Override the default Supabase URL/anon key (otherwise uses NEXT_PUBLIC_*). */
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  bucket?: string;
};

const MAX_BYTES = 5 * 1024 * 1024;

export function Uploader({
  kind,
  scopeId,
  value,
  onChange,
  className,
  shape = "square",
}: UploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [keyState, setKeyState] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("File too large (max 5MB).");
      return;
    }
    setUploading(true);
    try {
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          contentType: file.type,
          size: file.size,
          scopeId,
        }),
      });

      if (!presignRes.ok) {
        const body = await presignRes.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to start upload");
      }

      const {
        key,
        token,
        publicUrl,
      }: { key: string; uploadUrl: string; token: string; publicUrl: string } =
        await presignRes.json();

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) {
        throw new Error(
          "Supabase storage is not configured on the client. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
      }

      const supabase = createClient(supabaseUrl, anonKey);
      const bucket =
        process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "uploads";
      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(key, token, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadErr) throw new Error(uploadErr.message);

      setKeyState(key);
      onChange(publicUrl, key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    setKeyState(null);
    onChange(null, null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const radiusClass = shape === "circle" ? "rounded-full" : "rounded-lg";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "relative grid size-20 shrink-0 place-items-center overflow-hidden border border-white/10 bg-white/5 text-xs text-muted-foreground",
            radiusClass,
          )}
        >
          {value ? (
            <Image
              src={value}
              alt="Upload preview"
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clear}
                disabled={uploading}
              >
                <X className="size-3.5" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WebP, GIF or SVG up to 5MB.
          </p>
        </div>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      {keyState && <input type="hidden" name="logoKey" value={keyState} />}
    </div>
  );
}
