import { Role } from "@prisma/client";

const RANK: Record<Role, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
};

/** Strictly greater rank, e.g. ADMIN can act on MEMBER but not on ADMIN. */
export function outranks(actor: Role, target: Role): boolean {
  return RANK[actor] > RANK[target];
}

export function canInvite(actor: Role): boolean {
  return actor === "OWNER" || actor === "ADMIN";
}

export function canRemoveMember(actor: Role, target: Role): boolean {
  if (target === "OWNER") return false;
  return outranks(actor, target);
}

export function canChangeRole(
  actor: Role,
  target: Role,
  nextRole: Role,
): boolean {
  if (target === "OWNER") return false;
  if (nextRole === "OWNER") return false; // Owner transfer is a separate flow
  return outranks(actor, target) && outranks(actor, nextRole) || actor === "OWNER";
}

export function canManageWorkspace(actor: Role): boolean {
  return actor === "OWNER";
}

export function canManageBilling(actor: Role): boolean {
  return actor === "OWNER";
}
