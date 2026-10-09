import { TransactionForm } from "@/components/transaction-form";
import { AddAccountCard, AddEnvelopeCard } from "@/components/month-setup";
import { currentYearMonth, ensureMonthBudget, getAccounts, getCategories } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { requestNow } from "@/lib/request-now";

export default async function AddPage() {
  if (!isSupabaseConfigured()) {
    return <p className="text-sm text-muted">Configure Supabase before adding expenses.</p>;
  }
  const month = currentYearMonth(await requestNow());
  const [accounts, categories, { envelopes }] = await Promise.all([
    getAccounts(),
    getCategories(),
    ensureMonthBudget(month),
  ]);
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add expense</h1>
        <p className="mt-1 text-sm text-muted">Amount, spent from which account, what it was for.</p>
      </div>
      {accounts.length === 0 ? <AddAccountCard /> : null}
      {envelopes.length === 0 ? <AddEnvelopeCard month={month} /> : null}
      {accounts.length > 0 ? (
        <TransactionForm accounts={accounts} categories={categories} compact />
      ) : null}
    </div>
  );
}
