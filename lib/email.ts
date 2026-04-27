import { env } from "@/lib/env";

/**
 * Minimal Resend wrapper. If `RESEND_API_KEY` is unset (e.g. dev), logs the
 * email payload to the server console so invite links are still copy-pasteable.
 */
export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log("[email:dev]", {
      from: env.RESEND_FROM_EMAIL,
      ...input,
    });
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend send failed: ${res.status} ${body}`);
  }
}

export function inviteEmailHtml(opts: {
  workspaceName: string;
  inviterName: string;
  acceptUrl: string;
  expiresInDays: number;
}): string {
  return `
    <div style="font-family:-apple-system,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111;">
      <h2 style="margin:0 0 16px;font-size:20px;">You've been invited to ${escapeHtml(opts.workspaceName)}</h2>
      <p style="margin:0 0 16px;line-height:1.5;">
        ${escapeHtml(opts.inviterName)} invited you to join their workspace on AI BrandScale.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${opts.acceptUrl}"
           style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;">
          Accept invitation
        </a>
      </p>
      <p style="margin:0;color:#666;font-size:12px;">
        This link expires in ${opts.expiresInDays} days. If you didn't expect this, you can ignore the email.
      </p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
