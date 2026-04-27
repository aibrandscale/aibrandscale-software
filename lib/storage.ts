import { randomBytes } from "node:crypto";

import { env } from "@/lib/env";
import { supabaseAdmin, publicStorageUrl } from "@/lib/supabase";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export function isAllowedImageType(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

export type UploadKind = "brand-logo" | "product-image";

function nanoid(bytes = 12): string {
  return randomBytes(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function buildStorageKey({
  workspaceId,
  kind,
  contentType,
  scopeId,
}: {
  workspaceId: string;
  kind: UploadKind;
  contentType: string;
  scopeId?: string;
}): string {
  const ext = EXT_BY_MIME[contentType] ?? "bin";
  const id = nanoid();
  const segment = kind === "brand-logo" ? "brands" : "products";
  const scope = scopeId ?? "pending";
  return `ws/${workspaceId}/${segment}/${scope}/${id}.${ext}`;
}

/**
 * Issues a signed PUT URL for direct browser → Supabase Storage upload.
 * Returns the path key, the upload URL + token, and the eventual public URL.
 */
export async function createSignedUpload(args: {
  workspaceId: string;
  kind: UploadKind;
  contentType: string;
  scopeId?: string;
}): Promise<{
  key: string;
  uploadUrl: string;
  token: string;
  publicUrl: string;
}> {
  const key = buildStorageKey(args);

  const { data, error } = await supabaseAdmin()
    .storage.from(env.SUPABASE_STORAGE_BUCKET)
    .createSignedUploadUrl(key);

  if (error || !data) {
    throw new Error(`Failed to create signed upload URL: ${error?.message}`);
  }

  return {
    key,
    uploadUrl: data.signedUrl,
    token: data.token,
    publicUrl: publicStorageUrl(key),
  };
}

export async function deleteStorageObject(key: string): Promise<void> {
  await supabaseAdmin()
    .storage.from(env.SUPABASE_STORAGE_BUCKET)
    .remove([key]);
}
