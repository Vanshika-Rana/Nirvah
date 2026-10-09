"use server";

import { fail, withAction, type ActionResult } from "@/lib/action-result";
import { getAuthContext } from "@/lib/data";
import { ENVELOPE_KINDS, type EnvelopeKind } from "@/lib/finance/month-plan";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function refresh() {
  revalidatePath("/");
  revalidatePath("/add");
  revalidatePath("/weekly");
  revalidatePath("/history");
  revalidatePath("/settings");
}

const money = z.coerce.number().positive("Enter an amount greater than zero.").max(10_000_000);
const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);

export async function addIncome(input: {
  yearMonth: string;
  amount: number;
  label: string;
  isSalary?: boolean;
  occurredOn: string;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = z
    .object({
      yearMonth: monthSchema,
      amount: money,
      label: z.string().trim().min(1).max(80),
      isSalary: z.boolean().optional(),
      occurredOn: z.string(),
    })
    .safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the income.");
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const { data, error } = await supabase
      .from("incomes")
      .insert({
        user_id: user.id,
        year_month: `${parsed.data.yearMonth}-01`,
        amount: parsed.data.amount,
        label: parsed.data.label,
        is_salary: Boolean(parsed.data.isSalary),
        occurred_on: parsed.data.occurredOn,
      })
      .select("id")
      .single();
    if (error) throw error;
    if (parsed.data.isSalary) {
      await supabase.from("profiles").upsert({
        id: user.id,
        default_salary: parsed.data.amount,
      });
    }
    refresh();
    return { id: data.id };
  }, "Could not save income.");
}

export async function deleteIncome(id: string): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const { error } = await supabase.from("incomes").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    refresh();
    return { id };
  }, "Could not remove income.");
}

export async function saveWeeklyTarget(
  yearMonth: string,
  weeklyTarget: number,
): Promise<ActionResult<{ weekly_target: number }>> {
  const parsed = z
    .object({
      yearMonth: monthSchema,
      weeklyTarget: z.coerce.number().min(0).max(10_000_000),
    })
    .safeParse({ yearMonth, weeklyTarget });
  if (!parsed.success) return fail("Enter a weekly target.");
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const { error } = await supabase
      .from("monthly_budgets")
      .update({ weekly_target: parsed.data.weeklyTarget })
      .eq("user_id", user.id)
      .eq("year_month", `${parsed.data.yearMonth}-01`);
    if (error) throw error;
    refresh();
    return { weekly_target: parsed.data.weeklyTarget };
  }, "Could not save the weekly target.");
}

export async function saveDefaultSalary(amount: number): Promise<ActionResult<{ default_salary: number }>> {
  const parsed = z.coerce.number().min(0).max(10_000_000).safeParse(amount);
  if (!parsed.success) return fail("Enter a salary amount.");
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      default_salary: parsed.data,
    });
    if (error) throw error;
    refresh();
    return { default_salary: parsed.data };
  }, "Could not save usual salary.");
}

export async function saveEnvelope(input: {
  id?: string;
  yearMonth: string;
  name: string;
  kind: EnvelopeKind;
  amount: number;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = z
    .object({
      id: z.string().uuid().optional(),
      yearMonth: monthSchema,
      name: z.string().trim().min(1).max(80),
      kind: z.enum(ENVELOPE_KINDS),
      amount: z.coerce.number().min(0).max(10_000_000),
    })
    .safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the envelope.");
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const bucket =
      parsed.data.kind === "save" ? "savings" : parsed.data.kind === "commit" ? "other" : "personal";
    let categoryId: string | null = null;
    const existingCategory = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", user.id)
      .ilike("name", parsed.data.name)
      .maybeSingle();
    if (existingCategory.data) {
      categoryId = existingCategory.data.id;
      await supabase
        .from("categories")
        .update({ kind: parsed.data.kind, is_active: true })
        .eq("id", categoryId)
        .eq("user_id", user.id);
    } else {
      const created = await supabase
        .from("categories")
        .insert({
          user_id: user.id,
          name: parsed.data.name,
          bucket,
          kind: parsed.data.kind,
          is_active: true,
          sort_order: 50,
        })
        .select("id")
        .single();
      if (created.error) throw created.error;
      categoryId = created.data.id;
    }

    if (parsed.data.id) {
      const { error } = await supabase
        .from("envelopes")
        .update({
          name: parsed.data.name,
          kind: parsed.data.kind,
          amount: parsed.data.amount,
          category_id: categoryId,
        })
        .eq("id", parsed.data.id)
        .eq("user_id", user.id);
      if (error) throw error;
      refresh();
      return { id: parsed.data.id };
    }

    const inserted = await supabase
      .from("envelopes")
      .insert({
        user_id: user.id,
        year_month: `${parsed.data.yearMonth}-01`,
        name: parsed.data.name,
        kind: parsed.data.kind,
        amount: parsed.data.amount,
        category_id: categoryId,
        sort_order: 50,
      })
      .select("id")
      .single();
    if (inserted.error) throw inserted.error;
    refresh();
    return { id: inserted.data.id };
  }, "Could not save the envelope.");
}

export async function deleteEnvelope(id: string): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const { error } = await supabase.from("envelopes").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    refresh();
    return { id };
  }, "Could not remove the envelope.");
}
