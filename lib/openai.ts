import { createOpenAI } from "@ai-sdk/openai";

import { env } from "@/lib/env";

let _openai: ReturnType<typeof createOpenAI> | null = null;

export function openaiProvider() {
  if (!env.OPENAI_API_KEY) {
    throw new Error(
      "OpenAI is not configured. Set OPENAI_API_KEY in .env.local.",
    );
  }
  if (_openai) return _openai;
  _openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
  return _openai;
}

export const DEFAULT_MODEL = "gpt-4o-mini";
