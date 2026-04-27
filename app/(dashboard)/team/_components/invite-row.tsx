"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { revokeInvite } from "@/app/actions/team";

type InviteRowProps = {
  inviteId: string;
  email: string;
  role: string;
  expiresAt: string;
  canRevoke: boolean;
};

export function InviteRow({
  inviteId,
  email,
  role,
  expiresAt,
  canRevoke,
}: InviteRowProps) {
  const [pending, startTransition] = useTransition();

  function onRevoke() {
    if (!confirm(`Revoke invite for ${email}?`)) return;
    const fd = new FormData();
    fd.set("inviteId", inviteId);
    startTransition(() => {
      void revokeInvite(fd);
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-white/10 bg-white/5 px-4 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{email}</span>
        <span className="text-xs text-muted-foreground">
          Pending — expires {expiresAt}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="capitalize">
          {role.toLowerCase()}
        </Badge>
        {canRevoke && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRevoke}
            disabled={pending}
          >
            Revoke
          </Button>
        )}
      </div>
    </li>
  );
}
