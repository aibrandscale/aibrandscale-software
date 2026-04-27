"use server";

import { z } from "zod";

import { auth } from "@/auth";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";

const supportSchema = z.object({
  subject: z.string().min(1).max(120),
  message: z.string().min(10).max(5000),
});

export type SupportResult = { ok: true } | { ok: false; error: string };

const SUPPORT_EMAIL = "support@aibrandscale.local";

export async function submitSupportRequest(
  formData: FormData,
): Promise<SupportResult> {
  const session = await auth();
  if (!session?.user?.email) return { ok: false, error: "Unauthorized." };

  const parsed = supportSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Subject and message are required (10+ chars).",
    };
  }

  try {
    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[Support] ${parsed.data.subject}`,
      html: `<p><strong>From:</strong> ${session.user.email}</p>
<p><strong>App URL:</strong> ${env.NEXTAUTH_URL}</p>
<hr />
<pre style="white-space:pre-wrap;font-family:inherit">${escape(
        parsed.data.message,
      )}</pre>`,
      text: `From: ${session.user.email}\n\n${parsed.data.message}`,
    });
  } catch (err) {
    console.error("support email failed", err);
    return { ok: false, error: "Could not send your message. Try again." };
  }

  return { ok: true };
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
