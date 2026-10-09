import { TransactionForm } from "@/components/transaction-form";
import { AddAccountCard, AddEnvelopeCard } from "@/components/month-setup";
import { ensureMonthBudget, getAccounts, getCategories, getProfile, getSalaryIncomes } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { currentCycleMonth, salaryDates, todayISO } from "@/lib/finance/dates";
import { requestNow } from "@/lib/request-now";

export default async function AddPage() {
  if (!isSupabaseConfigured()) {
    return <p className="text-sm text-muted">Configure Supabase before adding expenses.</p>;
  }
  const now = await requestNow();
  const today = todayISO(now);
  const [salaries, profile] = await Promise.all([getSalaryIncomes(), getProfile()]);
  const month = currentCycleMonth(salaryDates(salaries), today);
  const ledger = profile.tracker_mode === "ledger";
  const [accounts, categories, plan] = await Promise.all([
    getAccounts(),
    getCategories(),
    ledger ? Promise.resolve({ envelopes: [] }) : ensureMonthBudget(month),
  ]);
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{ledger ? "Add" : "Add expense"}</h1>
        <p className="mt-1 text-sm text-muted">
          {ledger ? "Income or an expense, then a category." : "Amount, spent from, what for."}
        </p>
      </div>
      {accounts.length === 0 ? <AddAccountCard /> : null}
      {!ledger && plan.envelopes.length === 0 ? <AddEnvelopeCard month={month} /> : null}
      {accounts.length > 0 ? (
        <TransactionForm accounts={accounts} categories={categories} compact ledger={ledger} />
      ) : null}
    </div>
  );
}
