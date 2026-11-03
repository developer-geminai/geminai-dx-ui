"use client";
import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { loginAction, type LoginState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="accessKey">Access key</Label>
        <Input id="accessKey" name="accessKey" type="password" autoComplete="current-password" required autoFocus aria-invalid={Boolean(state.error)} aria-describedby={state.error ? "login-error" : undefined} />
      </div>
      {state.error ? (
        <p id="login-error" role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        <KeyRound aria-hidden />
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
