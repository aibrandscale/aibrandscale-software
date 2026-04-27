"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInAction,
  signInWithGoogleAction,
  type ActionState,
} from "@/app/actions/auth";

const initial: ActionState = { ok: false };

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, initial);

  return (
    <div className="flex flex-col gap-4">
      <form action={signInWithGoogleAction}>
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="w-full"
        >
          Continue with Google
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          {state.fieldErrors?.email?.[0] && (
            <p className="text-xs text-error">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          {state.fieldErrors?.password?.[0] && (
            <p className="text-xs text-error">
              {state.fieldErrors.password[0]}
            </p>
          )}
        </div>

        {state.error && <p className="text-sm text-error">{state.error}</p>}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
