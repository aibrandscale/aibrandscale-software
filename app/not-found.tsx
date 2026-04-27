import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-5xl font-semibold text-brand-muted">404</span>
      <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or you don&apos;t
        have access.
      </p>
      <Link
        href="/"
        className={buttonVariants({ variant: "outline" })}
      >
        Back to home
      </Link>
    </main>
  );
}
