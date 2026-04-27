"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-error/15 text-error">
        <AlertCircle className="size-5" />
      </span>
      <h1 className="text-xl font-semibold tracking-tight">Something broke</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "An unexpected error happened. Try again."}
      </p>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
