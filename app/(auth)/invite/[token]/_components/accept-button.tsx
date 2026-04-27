"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/app/actions/team";

export function AcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await acceptInvite(token);
      if (res.ok) {
        router.push("/team");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={onClick} disabled={pending} size="lg">
        {pending ? "Accepting…" : "Accept invitation"}
      </Button>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
