"use server";

import { fail, withAction, type ActionResult } from "@/lib/action-result";
import { getAuthContext } from "@/lib/data";
import { budgetSchema, familyAllocationSchema } from "@/lib/validation/budget";
import { revalidatePath } from "next/cache";

function refresh() {
  revalidatePath("/");
  revalidatePath("/weekly");
  revalidatePath("/settings");
}

export async function saveBudget(input: unknown): Promise<ActionResult<{ year_month: string }>> {
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the budget amounts.");
  }
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const yearMonth = `${parsed.data.year_month}-01`;
    const { error } = await supabase.from("monthly_budgets").upsert(
      {
        user_id: user.id,
        year_month: yearMonth,
        salary: parsed.data.salary,
        personal_limit: parsed.data.personal_limit,
        family_limit: parsed.data.family_limit,
        weekly_target: parsed.data.weekly_target,
        home_loan: parsed.data.home_loan,
        credit_card_bill: parsed.data.credit_card_bill,
        sip: parsed.data.sip,
        savings: parsed.data.savings,
        buffer: parsed.data.buffer,
      },
      { onConflict: "user_id,year_month" },
    );
    if (error) throw error;
    refresh();
    return { year_month: parsed.data.year_month };
  }, "Could not save the budget.");
}

export async function saveFamilyAllocations(
  yearMonth: string,
  allocations: unknown,
): Promise<ActionResult<{ count: number }>> {
  const parsed = familyAllocationSchema.array().safeParse(allocations);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check family allocations.");
  }
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const month = `${yearMonth}-01`;
    const { error: deleteError } = await supabase
      .from("family_allocations")
      .delete()
      .eq("user_id", user.id)
      .eq("year_month", month);
    if (deleteError) throw deleteError;
    if (parsed.data.length > 0) {
      const { error } = await supabase.from("family_allocations").insert(
        parsed.data.map((row, index) => ({
          user_id: user.id,
          year_month: month,
          name: row.name,
          amount: row.amount,
          sort_order: row.sort_order ?? index + 1,
        })),
      );
      if (error) throw error;
    }
    refresh();
    return { count: parsed.data.length };
  }, "Could not save family allocations.");
}

export async function recordMonthlyAllocations(
  yearMonth: string,
): Promise<ActionResult<{ created: number }>> {
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const month = `${yearMonth}-01`;
    const [{ data: budget, error: budgetError }, { data: accounts }, { data: categories }] =
      await Promise.all([
        supabase.from("monthly_budgets").select("*").eq("user_id", user.id).eq("year_month", month).single(),
        supabase.from("accounts").select("*").eq("user_id", user.id),
        supabase.from("categories").select("*").eq("user_id", user.id),
      ]);
    if (budgetError || !budget) throw new Error("Save this month's budget first.");

    const existing = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("source", "allocation")
      .gte("occurred_on", month)
      .lte("occurred_on", month.replace(/-01$/, "") + "-31");
    if ((existing.data ?? []).length > 0) {
      throw new Error("This month's allocations are already recorded.");
    }

    const byName = (name: string) => accounts?.find((account) => account.name === name);
    const byBucket = (bucket: string) => categories?.find((category) => category.bucket === bucket);
    const hdfc1 = byName("HDFC 1");
    const hdfc2 = byName("HDFC 2");
    const sbi = byName("SBI");
    const card = byName("Credit Card");
    if (!hdfc1 || !hdfc2 || !sbi || !card) {
      throw new Error("Default accounts are missing. Add HDFC 1, HDFC 2, SBI, and Credit Card first.");
    }

    const rows = [
      {
        amount: Number(budget.home_loan),
        type: "expense" as const,
        category_id: byBucket("home_loan")?.id ?? null,
        account_id: hdfc1.id,
        payment_method: "bank_transfer" as const,
        description: "Home loan",
      },
      {
        amount: Number(budget.credit_card_bill),
        type: "repayment" as const,
        category_id: byBucket("credit_card_bill")?.id ?? null,
        account_id: hdfc1.id,
        counterparty_account_id: card.id,
        payment_method: "bank_transfer" as const,
        description: "Credit card bill payment",
      },
      {
        amount: Number(budget.sip),
        type: "transfer" as const,
        category_id: byBucket("sip")?.id ?? null,
        account_id: hdfc2.id,
        counterparty_account_id: sbi.id,
        payment_method: "bank_transfer" as const,
        description: "Mutual fund SIP",
      },
      {
        amount: Number(budget.savings),
        type: "transfer" as const,
        category_id: byBucket("savings")?.id ?? null,
        account_id: hdfc2.id,
        counterparty_account_id: sbi.id,
        payment_method: "bank_transfer" as const,
        description: "Emergency/future savings",
      },
      {
        amount: Number(budget.buffer),
        type: "transfer" as const,
        category_id: byBucket("buffer")?.id ?? null,
        account_id: hdfc2.id,
        counterparty_account_id: sbi.id,
        payment_method: "bank_transfer" as const,
        description: "Irregular-expense buffer",
      },
    ].filter((row) => row.amount > 0);

    const { error } = await supabase.from("transactions").insert(
      rows.map((row) => ({
        user_id: user.id,
        occurred_on: month,
        source: "allocation",
        note: "Recorded from monthly allocations. This is not a bank import.",
        counterparty_account_id: "counterparty_account_id" in row ? row.counterparty_account_id : null,
        ...row,
      })),
    );
    if (error) throw error;

    await supabase
      .from("monthly_budgets")
      .update({ allocations_recorded_at: new Date().toISOString() })
      .eq("id", budget.id)
      .eq("user_id", user.id);

    refresh();
    return { created: rows.length };
  }, "Could not record allocations.");
}

export async function recordSalary(yearMonth: string): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const month = `${yearMonth}-01`;
    const [{ data: budget }, { data: accounts }, { data: categories }] = await Promise.all([
      supabase.from("monthly_budgets").select("*").eq("user_id", user.id).eq("year_month", month).single(),
      supabase.from("accounts").select("*").eq("user_id", user.id),
      supabase.from("categories").select("*").eq("user_id", user.id),
    ]);
    if (!budget) throw new Error("Save this month's budget first.");
    const hdfc1 = accounts?.find((account) => account.name === "HDFC 1");
    const salaryCategory = categories?.find((category) => category.name === "Salary");
    if (!hdfc1) throw new Error("HDFC 1 account is missing.");

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        occurred_on: month,
        amount: Number(budget.salary),
        type: "income",
        category_id: salaryCategory?.id ?? null,
        account_id: hdfc1.id,
        payment_method: "bank_transfer",
        description: "Monthly salary",
        note: "Entered by you. This app cannot see your bank.",
        source: "manual",
      })
      .select("id")
      .single();
    if (error) throw error;
    refresh();
    return { id: data.id };
  }, "Could not record salary.");
}
