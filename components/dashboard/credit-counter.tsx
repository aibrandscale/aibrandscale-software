import { Sparkles } from "lucide-react";

import { getWorkspaceCredits } from "@/lib/workspace-context";

export async function CreditCounter({ workspaceId }: { workspaceId: string }) {
  const sub = await getWorkspaceCredits(workspaceId);
  const remaining = sub?.creditsRemaining ?? 0;
  const total = sub?.creditsPerCycle ?? 0;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
      <Sparkles className="size-3.5 text-brand-muted" strokeWidth={2} />
      <span className="font-medium text-foreground">{remaining}</span>
      <span className="text-muted-foreground">/ {total} credits</span>
    </div>
  );
}
