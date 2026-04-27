import { Suspense } from "react";

import { CreditCounter } from "@/components/dashboard/credit-counter";
import { AccountMenu } from "@/components/dashboard/account-menu";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActiveWorkspace } from "@/lib/workspace-context";

export function BrandContextHeader({
  workspace,
}: {
  workspace: ActiveWorkspace;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-white/10 px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        <span className="grid size-7 place-items-center rounded-md bg-brand/15 text-xs font-semibold text-brand-muted">
          {workspace.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium">{workspace.name}</span>
          <span className="text-xs text-muted-foreground">
            {workspace.role.toLowerCase()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Suspense
          fallback={<Skeleton className="h-7 w-32 rounded-full" />}
        >
          <CreditCounter workspaceId={workspace.id} />
        </Suspense>
        <AccountMenu
          email={workspace.userEmail}
          name={workspace.userName}
        />
      </div>
    </header>
  );
}
