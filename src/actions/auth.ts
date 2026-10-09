"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { authSchema } from "@/lib/validation/budget";
import { redirect } from "next/navigation";

export async function signIn(
  formData: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  if (!isSupabaseConfigured()) {
    return fail("Add your Supabase URL and anon key before signing in.");
  }
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check your email and password.");
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return fail("Could not sign in. Check your email and password.");
  }
  return ok({ redirectTo: "/" });
}

export async function signUp(
  formData: FormData,
): Promise<ActionResult<{ redirectTo: string; needsEmail: boolean }>> {
  if (!isSupabaseConfigured()) {
    return fail("Add your Supabase URL and anon key before creating an account.");
  }
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check your email and password.");
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) {
    return fail("Could not create the account. Try a different email.");
  }
  if (data.session) {
    return ok({ redirectTo: "/", needsEmail: false });
  }
  return ok(
    { redirectTo: "/login", needsEmail: true },
    "Check your email to confirm the account, then sign in.",
  );
}

export async function signOut() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
