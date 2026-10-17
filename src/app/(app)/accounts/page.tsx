import { Suspense } from "react";
import { AccountsManage } from "@/components/accounts-manage";
import { MonthSelector } from "@/components/month-selector";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ensureAccountMonthBalances,
  getAccounts,
  getProfile,
  getSalaryIncomes,
  getTransactionsInRange,
  isAccountBalanceSchemaReady,
} from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { summarizeAccounts } from "@/lib/finance/accounts";
import {
  currentCycleMonth,
  cycleSpendEnd,
  monthRange,
  payCycleForMonth,
  salaryDates,
  todayISO,
} from "@/lib/finance/dates";
import { requestNow } from "@/lib/request-now";

export default function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <Accounts searchParams={searchParams} />
    </Suspense>
  );
}

async function Accounts({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const now = await requestNow();
  if (!isSupabaseConfigured()) {
    return <p className="text-sm text-muted">Configure Supabase to manage accounts.</p>;
  }

  const today = todayISO(now);
  const [profile, salaries, accounts, schemaReady] = await Promise.all([
    getProfile(),
    getSalaryIncomes(),
    getAccounts(),
    isAccountBalanceSchemaReady(),
  ]);
  if (profile.tracker_mode === "ledger") {
    return <p className="text-sm text-muted">Accounts for leftover tracking are part of the envelope home.</p>;
  }

  const dates = salaryDates(salaries);
  const month = params.month ?? currentCycleMonth(dates, today);
  const cycle = payCycleForMonth(dates, month);
  const spendEnd = cycle ? cycleSpendEnd(cycle, today) : today;
  const [snapshots, transactions] = await Promise.all([
    ensureAccountMonthBalances(month),
    getTransactionsInRange(cycle?.start ?? monthRange(month).start, spendEnd),
  ]);
  const summary = summarizeAccounts({
    accounts,
    snapshots,
    transactions,
    cycleStart: cycle?.start ?? null,
    cycleEnd: spendEnd,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Accounts</h1>
          <p className="text-sm text-muted">
            Type what was already in each account, then what you put in this payday. Next payday, leftover becomes the
            start.
          </p>
        </div>
        <MonthSelector month={month} path="/accounts" salaryDates={dates} />
      </div>
      {!schemaReady ? (
        <div className="rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          Run <code className="font-medium">supabase/migrations/0005_account_month_balances.sql</code> in the
          Supabase SQL editor so leftovers can carry to the next payday.
        </div>
      ) : null}
      <AccountsManage month={month} accounts={accounts} rows={summary.accounts} />
    </div>
  );
}
