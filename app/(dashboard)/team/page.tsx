import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/lib/workspace-context";
import { canInvite } from "@/lib/permissions";
import { PageHeader } from "@/components/dashboard/page-shell";
import { InviteDialog } from "./_components/invite-dialog";
import { MemberRow } from "./_components/member-row";
import { InviteRow } from "./_components/invite-row";

export const metadata = { title: "Team — AI BrandScale" };

export default async function TeamPage() {
  const ws = await getActiveWorkspace();

  const [members, invites] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: ws.id },
      include: {
        user: { select: { email: true, name: true, image: true } },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.invite.findMany({
      where: { workspaceId: ws.id, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const actorCanInvite = canInvite(ws.role);
  const dateFmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Team"
        description="Invite teammates to collaborate in this workspace."
        actions={actorCanInvite ? <InviteDialog /> : null}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Members ({members.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              memberId={m.id}
              email={m.user.email}
              name={m.user.name}
              role={m.role}
              isSelf={m.userId === ws.userId}
              actorRole={ws.role}
            />
          ))}
        </ul>
      </section>

      {invites.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Pending invitations ({invites.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {invites.map((i) => (
              <InviteRow
                key={i.id}
                inviteId={i.id}
                email={i.email}
                role={i.role}
                expiresAt={dateFmt.format(i.expiresAt)}
                canRevoke={actorCanInvite}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
