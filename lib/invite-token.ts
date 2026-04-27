import { randomBytes, createHash } from "node:crypto";

const TTL_DAYS = 7;

/** URL-safe base64 (no padding). 32 bytes → 43 chars. */
export function generateInviteToken(): string {
  return randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + TTL_DAYS * 24 * 60 * 60 * 1000);
}
