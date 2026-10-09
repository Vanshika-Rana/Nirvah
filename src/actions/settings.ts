"use server";

import { fail, withAction, type ActionResult } from "@/lib/action-result";
import { getAuthContext } from "@/lib/data";
import { accountSchema, categorySchema, profileSchema } from "@/lib/validation/budget";
import { revalidatePath } from "next/cache";

function refresh() {
  revalidatePath("/");
  revalidatePath("/add");
  revalidatePath("/settings");
  revalidatePath("/history");
}

export async function saveWeekStart(weekStartDay: number): Promise<ActionResult<{ week_start_day: number }>> {
  const parsed = profileSchema.safeParse({ week_start_day: weekStartDay });
  if (!parsed.success) return fail("Choose a valid week start day.");
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, week_start_day: parsed.data.week_start_day });
    if (error) throw error;
    refresh();
    return { week_start_day: parsed.data.week_start_day };
  }, "Could not save the week start day.");
}

export async function saveAccount(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the account.");
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    if (parsed.data.id) {
      const { error } = await supabase
        .from("accounts")
        .update({ name: parsed.data.name, kind: parsed.data.kind })
        .eq("id", parsed.data.id)
        .eq("user_id", user.id);
      if (error) throw error;
      refresh();
      return { id: parsed.data.id };
    }
    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        kind: parsed.data.kind,
        sort_order: 99,
        is_active: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    refresh();
    return { id: data.id };
  }, "Could not save the account.");
}

export async function setAccountActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const { error } = await supabase
      .from("accounts")
      .update({ is_active: isActive })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
    refresh();
    return { id };
  }, "Could not update the account.");
}

export async function saveCategory(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the category.");
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    if (parsed.data.id) {
      const { error } = await supabase
        .from("categories")
        .update({ name: parsed.data.name, bucket: parsed.data.bucket })
        .eq("id", parsed.data.id)
        .eq("user_id", user.id);
      if (error) throw error;
      refresh();
      return { id: parsed.data.id };
    }
    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        bucket: parsed.data.bucket,
        sort_order: 99,
        is_active: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    refresh();
    return { id: data.id };
  }, "Could not save the category.");
}

export async function setCategoryActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const { error } = await supabase
      .from("categories")
      .update({ is_active: isActive })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
    refresh();
    return { id };
  }, "Could not update the category.");
}
