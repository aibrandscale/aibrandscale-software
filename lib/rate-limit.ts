import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

type Limiter = {
  limit: (key: string) => Promise<{
    success: boolean;
    remaining: number;
    reset: number;
  }>;
};

function memoryLimiter(max: number, windowMs: number): Limiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    async limit(key) {
      const now = Date.now();
      const b = buckets.get(key);
      if (!b || b.resetAt <= now) {
        const resetAt = now + windowMs;
        buckets.set(key, { count: 1, resetAt });
        return { success: true, remaining: max - 1, reset: resetAt };
      }
      if (b.count >= max) {
        return { success: false, remaining: 0, reset: b.resetAt };
      }
      b.count += 1;
      return { success: true, remaining: max - b.count, reset: b.resetAt };
    },
  };
}

let _redis: Redis | null = null;
function redis(): Redis | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (_redis) return _redis;
  _redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return _redis;
}

function build(prefix: string, max: number, windowSec: number): Limiter {
  const r = redis();
  if (!r) return memoryLimiter(max, windowSec * 1000);
  const rl = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
    analytics: true,
    prefix,
  });
  return {
    async limit(key) {
      const res = await rl.limit(key);
      return {
        success: res.success,
        remaining: res.remaining,
        reset: res.reset,
      };
    },
  };
}

/** Generators: 10/minute and 60/hour per workspace. */
export const generationMinuteLimiter = build("rl:gen:m", 10, 60);
export const generationHourLimiter = build("rl:gen:h", 60, 60 * 60);

/** Auth: 5/minute per IP. */
export const authLimiter = build("rl:auth", 5, 60);

/** Returns the first failing window, or null if both pass. */
export async function checkGenerationLimit(workspaceId: string): Promise<{
  ok: true;
} | { ok: false; reset: number; window: "minute" | "hour" }> {
  const a = await generationMinuteLimiter.limit(workspaceId);
  if (!a.success) return { ok: false, reset: a.reset, window: "minute" };
  const b = await generationHourLimiter.limit(workspaceId);
  if (!b.success) return { ok: false, reset: b.reset, window: "hour" };
  return { ok: true };
}
