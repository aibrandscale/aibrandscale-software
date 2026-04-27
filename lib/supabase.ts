import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

let _admin: SupabaseClient | null = null;

/**
 * Server-side Supabase client using the service role key. Never import this
 * into a client component.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
  if (_admin) return _admin;
  _admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

export function publicStorageUrl(key: string): string {
  if (!env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL not configured");
  }
  const base = env.SUPABASE_URL.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET}/${key}`;
}
