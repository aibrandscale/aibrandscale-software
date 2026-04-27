"use client";

import { useTransition } from "react";
import type { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { changeRole, removeMember } from "@/app/actions/team";
import {
  canChangeRole,
  canRemoveMember,
} from "@/lib/permissions";

type MemberRowProps = {
  memberId: string;
  email: string;
  name: string | null;
  role: Role;
  isSelf: boolean;
  actorRole: Role;
};

export function MemberRow({
  memberId,
  email,
  name,
  role,
  isSelf,
  actorRole,
}: MemberRowProps) {
  const [pending, startTransition] = useTransition();
  const showRoleSelect = !isSelf && role !== "OWNER" && actorRole === "OWNER";
  const showRemove = isSelf
    ? role !== "OWNER"
    : canRemoveMember(actorRole, role);

  function onRoleChange(next: string | null) {
    if (!next || next === role) return;
    if (!canChangeRole(actorRole, role, next as Role)) return;
    const fd = new FormData();
    fd.set("memberId", memberId);
    fd.set("role", next);
    startTransition(() => {
      void changeRole(fd);
    });
  }

  function onRemove() {
    if (!confirm(isSelf ? "Leave this workspace?" : `Remove ${email}?`)) return;
    const fd = new FormData();
    fd.set("memberId", memberId);
    startTransition(() => {
      void removeMember(fd);
    });
  }

  const initial = (name ?? email).slice(0, 1).toUpperCase();

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand-muted">
          {initial}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">
            {name ?? email}
            {isSelf && (
              <span className="ml-2 text-xs text-muted-foreground">(you)</span>
            )}
          </span>
          {name && (
            <span className="truncate text-xs text-muted-foreground">
              {email}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {showRoleSelect ? (
          <Select
            value={role}
            onValueChange={onRoleChange}
            disabled={pending}
          >
            <SelectTrigger className="h-8 w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="MEMBER">Member</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary" className="capitalize">
            {role.toLowerCase()}
          </Badge>
        )}

        {showRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={pending}
          >
            {isSelf ? "Leave" : "Remove"}
          </Button>
        )}
      </div>
    </li>
  );
}
