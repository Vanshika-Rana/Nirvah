"use server";

import { fail, withAction, type ActionResult } from "@/lib/action-result";
import { ensureAccountMonthBalances, getAuthContext, getCategories } from "@/lib/data";
import { LEDGER_STARTER_CATEGORIES } from "@/lib/finance/ledger";
import { TRACKER_MODES, type TrackerMode } from "@/lib/types";
import { accountSchema, categorySchema, profileSchema } from "@/lib/validation/budget";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function refresh() {
  revalidatePath("/");
  revalidatePath("/add");
  revalidatePath("/settings");
  revalidatePath("/history");
  revalidatePath("/accounts");
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

function isMissingColumn(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST204" || /could not find the .* column/i.test(error.message ?? "");
}

const ACCOUNT_BALANCE_SQL = "Run supabase/migrations/0004_account_balances.sql so account balances can save.";

export async function saveAccount(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the account.");
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const opening =
      parsed.data.opening_balance === undefined ? undefined : Number(parsed.data.opening_balance);
    if (parsed.data.id) {
      const patch: { name: string; kind: string; opening_balance?: number } = {
        name: parsed.data.name,
        kind: parsed.data.kind,
      };
      if (opening !== undefined) patch.opening_balance = opening;
      const { error } = await supabase
        .from("accounts")
        .update(patch)
        .eq("id", parsed.data.id)
        .eq("user_id", user.id);
      if (error) {
        if (isMissingColumn(error)) throw new Error(ACCOUNT_BALANCE_SQL);
        throw error;
      }
      refresh();
      return { id: parsed.data.id };
    }
    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        kind: parsed.data.kind,
        opening_balance: opening ?? 0,
        sort_order: 99,
        is_active: true,
      })
      .select("id")
      .single();
    if (error) {
      if (isMissingColumn(error)) throw new Error(ACCOUNT_BALANCE_SQL);
      throw error;
    }
    refresh();
    return { id: data.id };
  }, "Could not save the account.");
}

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);

export async function saveAccountMonthBalance(input: {
  yearMonth: string;
  accountId: string;
  opening?: number;
  deposited?: number;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = z
    .object({
      yearMonth: monthSchema,
      accountId: z.string().uuid(),
      opening: z.coerce.number().min(-10_000_000).max(10_000_000).optional(),
      deposited: z.coerce.number().min(0).max(10_000_000).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the account amounts.");
  return withAction(async () => {
    await ensureAccountMonthBalances(parsed.data.yearMonth);
    const { supabase, user } = await getAuthContext();
    const patch: { opening?: number; deposited?: number } = {};
    if (parsed.data.opening !== undefined) patch.opening = parsed.data.opening;
    if (parsed.data.deposited !== undefined) patch.deposited = parsed.data.deposited;
    const { data, error } = await supabase
      .from("account_month_balances")
      .update(patch)
      .eq("user_id", user.id)
      .eq("account_id", parsed.data.accountId)
      .eq("year_month", `${parsed.data.yearMonth}-01`)
      .select("id")
      .single();
    if (error) {
      if (error.code === "PGRST205" || /could not find the (table|relation)/i.test(error.message ?? "")) {
        throw new Error("Run supabase/migrations/0005_account_month_balances.sql so account leftovers can save.");
      }
      throw error;
    }
    refresh();
    return { id: data.id };
  }, "Could not save the account amounts.");
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

export async function chooseTrackerMode(mode: TrackerMode): Promise<ActionResult<{ tracker_mode: TrackerMode }>> {
  const parsed = z.enum(TRACKER_MODES).safeParse(mode);
  if (!parsed.success) return fail("Choose how you want to use Nirvah.");
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    if (parsed.data === "ledger") {
      const existing = await getCategories();
      if (existing.length === 0) {
        const seeded = await supabase.from("categories").insert(
          LEDGER_STARTER_CATEGORIES.map((row) => ({
            user_id: user.id,
            name: row.name,
            bucket: row.bucket,
            kind: row.bucket === "income" ? "spend" : "spend",
            sort_order: row.sort_order,
            is_active: true,
          })),
        );
        if (seeded.error) throw seeded.error;
      }
    }
    const { error } = await supabase
      .from("profiles")
      .update({ tracker_mode: parsed.data })
      .eq("id", user.id);
    if (error) throw error;
    refresh();
    revalidatePath("/weekly");
    return { tracker_mode: parsed.data };
  }, "Could not save how you use Nirvah.");
}

export async function resetAccount(confirmation: string): Promise<ActionResult<{ reset: true }>> {
  if (confirmation.trim().toUpperCase() !== "RESET") {
    return fail("Type RESET to confirm.");
  }
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const tables = [
      "transactions",
      "incomes",
      "envelopes",
      "family_allocations",
      "monthly_budgets",
      "account_month_balances",
      "accounts",
      "categories",
    ] as const;
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq("user_id", user.id);
      if (error && error.code !== "PGRST205" && !/could not find the (table|relation)/i.test(error.message ?? "")) {
        throw error;
      }
    }
    const { error } = await supabase
      .from("profiles")
      .update({ default_salary: 0, tracker_mode: null })
      .eq("id", user.id);
    if (error) throw error;
    refresh();
    revalidatePath("/weekly");
    return { reset: true };
  }, "Could not reset the account.");
}
