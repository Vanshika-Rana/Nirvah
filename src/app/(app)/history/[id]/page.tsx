import { TransactionForm } from "@/components/transaction-form";
import { ensureMonthBudget, getAccounts, getAuthContext, getCategories, getProfile, getSalaryIncomes } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { currentCycleMonth, salaryDates, todayISO } from "@/lib/finance/dates";
import { requestNow } from "@/lib/request-now";
import type { Transaction } from "@/lib/types";
import { notFound } from "next/navigation";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const now = await requestNow();
  const today = todayISO(now);
  const { supabase, user } = await getAuthContext();
  const [salaries, profile] = await Promise.all([getSalaryIncomes(), getProfile()]);
  const month = currentCycleMonth(salaryDates(salaries), today);
  const [{ data: transaction }, accounts, categories, plan] = await Promise.all([
    supabase.from("transactions").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    getAccounts(),
    getCategories(),
    ensureMonthBudget(month),
  ]);
  if (!transaction) notFound();
  const row = transaction as Transaction;
  const ledger = profile.tracker_mode === "ledger";
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-5 text-2xl font-semibold tracking-tight">Edit transaction</h1>
      <TransactionForm
        accounts={accounts}
        categories={categories}
        transaction={{ ...row, amount: Number(row.amount) }}
        envelopes={plan.envelopes}
        month={ledger ? undefined : month}
        compact={ledger}
        ledger={ledger}
      />
    </div>
  );
}
