"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function UpdatePasswordForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    const supabase = createBrowserSupabase();
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        setReady(true);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  if (!configured) {
    return <p className="text-sm text-warning">Supabase is not configured, so a password cannot be saved.</p>;
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const password = String(new FormData(event.currentTarget).get("password") ?? "");
        startTransition(async () => {
          if (password.length < 8) {
            setError("Use at least 8 characters.");
            return;
          }
          const supabase = createBrowserSupabase();
          const { error: saveError } = await supabase.auth.updateUser({ password });
          if (saveError) {
            setError("Could not save the new password. Request a fresh reset link.");
            return;
          }
          router.push("/");
          router.refresh();
        });
      }}
    >
      {!ready ? (
        <p className="text-sm text-muted">
          Open the newest reset link from your email on this same site. Old links that go to localhost will not work.
        </p>
      ) : null}
      <Field label="New password">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" size="lg" disabled={pending || !ready}>
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
