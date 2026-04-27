import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hashInviteToken } from "@/lib/invite-token";
import { buttonVariants } from "@/components/ui/button";
import { AcceptButton } from "./_components/accept-button";

export const metadata = { title: "Accept invitation — AI BrandScale" };

type PageProps = { params: Promise<{ token: string }> };

export default async function AcceptInvitePage({ params }: PageProps) {
  const { token } = await params;
  const tokenHash = hashInviteToken(token);

  const invite = await prisma.invite.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      workspace: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!invite) {
    return (
      <Status
        title="Invitation not found"
        body="This link may have already been used or revoked."
      />
    );
  }
  if (invite.acceptedAt) {
    return (
      <Status
        title="Already accepted"
        body="This invitation has already been used."
      />
    );
  }
  if (invite.expiresAt < new Date()) {
    return (
      <Status
        title="Invitation expired"
        body="Ask the workspace admin for a new invite."
      />
    );
  }

  const session = await auth();
  const inviterLabel = invite.createdBy.name ?? invite.createdBy.email;

  if (!session?.user?.email) {
    const signupUrl = `/signup?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.email)}`;
    const signinUrl = `/signin?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`;
    return (
      <div className="flex flex-col gap-6">
        <Header workspaceName={invite.workspace.name} inviter={inviterLabel} />
        <p className="text-sm text-muted-foreground">
          Sign in or create an account with{" "}
          <span className="font-medium text-foreground">{invite.email}</span>{" "}
          to accept.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href={signupUrl}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-brand-hover"
          >
            Create account
          </Link>
          <Link
            href={signinUrl}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (session.user.email.toLowerCase() !== invite.email) {
    return (
      <div className="flex flex-col gap-4">
        <Header workspaceName={invite.workspace.name} inviter={inviterLabel} />
        <p className="text-sm text-error">
          This invitation is for{" "}
          <span className="font-medium">{invite.email}</span>, but you are
          signed in as{" "}
          <span className="font-medium">{session.user.email}</span>.
        </p>
        <p className="text-sm text-muted-foreground">
          Sign out and sign back in with the invited email to accept.
        </p>
        <Link
          href="/brands"
          className="inline-flex h-9 items-center justify-center self-start rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Header workspaceName={invite.workspace.name} inviter={inviterLabel} />
      <p className="text-sm text-muted-foreground">
        You&apos;ll be added as{" "}
        <span className="font-medium capitalize text-foreground">
          {invite.role.toLowerCase()}
        </span>
        .
      </p>
      <AcceptButton token={token} />
    </div>
  );
}

function Header({
  workspaceName,
  inviter,
}: {
  workspaceName: string;
  inviter: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-xl font-semibold tracking-tight">
        Join {workspaceName}
      </h1>
      <p className="text-sm text-muted-foreground">
        Invited by {inviter}.
      </p>
    </div>
  );
}

function Status({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      <Link
        href="/"
        className={buttonVariants({ variant: "outline" }) + " self-start"}
      >
        Back to home
      </Link>
    </div>
  );
}
