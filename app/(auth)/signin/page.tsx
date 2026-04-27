import Link from "next/link";

import { SignInForm } from "./_components/sign-in-form";

export const metadata = { title: "Sign in — AI BrandScale" };

export default function SignInPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to continue to your workspace.
        </p>
      </div>

      <SignInForm />

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-brand-muted hover:text-brand-hover">
          Create one
        </Link>
      </p>
    </div>
  );
}
