"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!configured) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm text-warning">
        Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, run the SQL migration, then restart the app. Cloud sync is not active until those values are set.
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = mode === "signin" ? await signIn(form) : await signUp(form);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          if (result.message) setMessage(result.message);
          if (result.data.redirectTo === "/") {
            router.push("/");
            router.refresh();
          }
        });
      }}
    >
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-ok">{message}</p> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
      </Button>
      <button
        type="button"
        className="text-sm font-medium text-accent"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
