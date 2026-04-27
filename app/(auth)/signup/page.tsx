import Link from "next/link";

import { SignUpForm } from "./_components/sign-up-form";

export const metadata = { title: "Sign up — AI BrandScale" };

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Create account</h1>
        <p className="text-sm text-muted-foreground">
          50 trial credits, no credit card required.
        </p>
      </div>

      <SignUpForm />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/signin"
          className="font-medium text-brand-muted hover:text-brand-hover"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
